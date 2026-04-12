import csv
import io
import json
import logging
import os
import re
from datetime import datetime, timezone
from pathlib import Path

from .data_processing import normalize_headers


LOGGER = logging.getLogger(__name__)
_cached_dataset = None
_cached_metadata = None

SOURCE_EMAIL = 'email'
SOURCE_MANUAL = 'manual'
ASSIGNEE_PATTERNS = (
    re.compile(r'assigned_to', re.IGNORECASE),
    re.compile(r'assignee', re.IGNORECASE),
    re.compile(r'owner', re.IGNORECASE),
    re.compile(r'agent', re.IGNORECASE),
)


def _storage_root():
    return Path(os.getenv('BACKEND_DATA_DIR', '/app/data'))


def _latest_csv_path():
    return _storage_root() / 'latest.csv'


def _source_metadata_path():
    return _storage_root() / 'source.json'


def _uploads_dir():
    return _storage_root() / 'uploads'


def _ensure_storage_dir():
    _storage_root().mkdir(parents=True, exist_ok=True)


def _current_timestamp():
    return datetime.now(timezone.utc).isoformat()


def _normalize_ticket_filename(value):
    return re.sub(r'[^a-z0-9]+', '', str(value or '').lower())


def is_active_ticket_file(filename):
    try:
        name = Path(str(filename or '')).name
    except Exception:
        name = str(filename or '')

    if not name.lower().endswith('.csv'):
        return False

    normalized = _normalize_ticket_filename(name)
    return 'activeticket' in normalized or 'activetickets' in normalized or 'dailydigest' in normalized


def _resolve_active_ticket_dataset_path():
    uploads_dir = _uploads_dir()
    if not uploads_dir.exists():
        return None

    candidates = []

    try:
        entries = list(uploads_dir.iterdir())
    except OSError:
        return None

    for entry in entries:
        if not entry.is_file() or entry.name.endswith('.meta.json'):
            continue

        if not is_active_ticket_file(entry.name):
            continue

        try:
            modified = entry.stat().st_mtime
        except OSError:
            modified = 0

        LOGGER.info('Valid active ticket dataset candidate found: %s', entry.name)
        candidates.append((modified, entry))

    if not candidates:
        return None

    candidates.sort(key=lambda item: item[0], reverse=True)
    return candidates[0][1]


def _parse_csv_bytes(content):
    decoded = content.decode('utf-8-sig', errors='replace')
    reader = csv.DictReader(io.StringIO(decoded))
    headers = normalize_headers(reader.fieldnames)
    reader.fieldnames = headers
    rows = [dict(row) for row in reader]

    if 'Ticket' not in headers:
        raise ValueError('The active ticket dataset is missing the Ticket field.')

    LOGGER.info('Active ticket dataset loaded with %s records.', len(rows))

    return {
        'columns': headers,
        'rows': rows,
    }


def _write_csv(dataset):
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=dataset['columns'], extrasaction='ignore')
    writer.writeheader()

    for row in dataset['rows']:
        writer.writerow({column: row.get(column, '') for column in dataset['columns']})

    content = output.getvalue().encode('utf-8')
    _latest_csv_path().write_bytes(content)
    LOGGER.info('Latest ticket CSV overwritten at %s', _latest_csv_path())


def _read_source_metadata():
    path = _source_metadata_path()
    if not path.exists():
        return {
            'source': None,
            'last_updated': None,
        }

    try:
        with path.open('r', encoding='utf-8') as handle:
            payload = json.load(handle)
    except (OSError, json.JSONDecodeError):
        return {
            'source': None,
            'last_updated': None,
        }

    if not isinstance(payload, dict):
        return {
            'source': None,
            'last_updated': None,
        }

    return {
        'source': payload.get('source'),
        'last_updated': payload.get('last_updated'),
    }


def _write_source_metadata(source, last_updated):
    _ensure_storage_dir()
    payload = {
        'source': source,
        'last_updated': last_updated,
    }

    with _source_metadata_path().open('w', encoding='utf-8') as handle:
        json.dump(payload, handle, indent=2)


def _set_cached_metadata(source, last_updated):
    global _cached_metadata
    path = _resolve_active_ticket_dataset_path()
    _cached_metadata = {
        'source': source,
        'last_updated': last_updated,
        'file_name': path.name if path else None,
    }


def _find_assignee_column(columns):
    for column in columns:
        if any(pattern.search(column) for pattern in ASSIGNEE_PATTERNS):
            return column

    return ''


def load_active_ticket_dataset(force_reload=False):
    global _cached_dataset, _cached_metadata

    if _cached_dataset is not None and not force_reload:
        if _cached_metadata is None:
            path = _resolve_active_ticket_dataset_path()
            _cached_metadata = {
                **_read_source_metadata(),
                'file_name': path.name if path else None,
            }
        return _cached_dataset

    path = _resolve_active_ticket_dataset_path()

    if path is None or not path.exists():
        _cached_dataset = {
            'columns': [],
            'rows': [],
        }
        _cached_metadata = {
            **_read_source_metadata(),
            'file_name': None,
        }
        return _cached_dataset

    content = path.read_bytes()
    _cached_dataset = _parse_csv_bytes(content)
    _cached_metadata = {
        **_read_source_metadata(),
        'file_name': path.name,
    }
    return _cached_dataset


def get_source_metadata(force_reload=False):
    global _cached_metadata

    if _cached_metadata is not None and not force_reload:
        return _cached_metadata

    path = _resolve_active_ticket_dataset_path()
    _cached_metadata = {
        **_read_source_metadata(),
        'file_name': path.name if path else None,
    }
    return _cached_metadata


def cache_active_ticket_dataset(content, source):
    global _cached_dataset

    _ensure_storage_dir()
    dataset = _parse_csv_bytes(content)
    _write_csv(dataset)
    timestamp = _current_timestamp()
    _write_source_metadata(source, timestamp)
    _set_cached_metadata(source, timestamp)
    _cached_dataset = dataset
    return dataset


def load_latest_ticket_payload(force_reload=False):
    dataset = load_active_ticket_dataset(force_reload=force_reload)
    metadata = get_source_metadata(force_reload=force_reload)

    return {
        'source': metadata.get('source'),
        'last_updated': metadata.get('last_updated'),
        'fileName': metadata.get('file_name'),
        'tickets': dataset['rows'],
        'columns': dataset['columns'],
        'message': '' if dataset['rows'] else 'No CSV dataset has been loaded yet.',
    }


def get_ticket_by_id(ticket_id):
    dataset = load_active_ticket_dataset()

    for row in dataset['rows']:
        if str(row.get('Ticket', '')).strip() == ticket_id:
            return row

    return None


def update_ticket_assignee(ticket_id, assignee):
    global _cached_dataset

    dataset = load_active_ticket_dataset()
    path = _resolve_active_ticket_dataset_path()
    assignee_column = _find_assignee_column(dataset['columns'])

    if not assignee_column:
        raise ValueError('The latest dataset does not include an assignee column.')

    if path is None:
        raise ValueError('No active ticket dataset is available.')

    updated = False
    for row in dataset['rows']:
        if str(row.get('Ticket', '')).strip() != ticket_id:
            continue

        row[assignee_column] = assignee
        updated = True
        break

    if not updated:
        return None

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=dataset['columns'], extrasaction='ignore')
    writer.writeheader()

    for row in dataset['rows']:
        writer.writerow({column: row.get(column, '') for column in dataset['columns']})

    path.write_bytes(output.getvalue().encode('utf-8'))
    metadata = get_source_metadata()
    last_updated = _current_timestamp()
    source = metadata.get('source') or SOURCE_MANUAL
    _write_source_metadata(source, last_updated)
    _set_cached_metadata(source, last_updated)
    _cached_dataset = dataset
    return get_ticket_by_id(ticket_id)

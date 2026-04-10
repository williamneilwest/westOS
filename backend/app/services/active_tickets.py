import csv
import io
import logging
import os
from pathlib import Path

from .data_processing import normalize_headers


LOGGER = logging.getLogger(__name__)
_cached_dataset = None


def _active_tickets_path():
    return Path(os.getenv('ACTIVE_TICKETS_PATH', '/data/active_tickets.csv'))


def _ensure_storage_dir():
    _active_tickets_path().parent.mkdir(parents=True, exist_ok=True)


def _parse_csv_bytes(content):
    decoded = content.decode('utf-8-sig', errors='replace')
    reader = csv.DictReader(io.StringIO(decoded))
    headers = normalize_headers(reader.fieldnames)
    reader.fieldnames = headers
    rows = [dict(row) for row in reader]

    LOGGER.info('Active ticket dataset loaded with %s records.', len(rows))

    return {
        'columns': headers,
        'rows': rows,
    }


def save_active_tickets_csv(content):
    _ensure_storage_dir()
    path = _active_tickets_path()
    path.write_bytes(content)
    LOGGER.info('Active tickets CSV overwritten at %s', path)


def load_active_ticket_dataset(force_reload=False):
    global _cached_dataset

    if _cached_dataset is not None and not force_reload:
        return _cached_dataset

    path = _active_tickets_path()

    if not path.exists():
        return None

    content = path.read_bytes()
    _cached_dataset = _parse_csv_bytes(content)

    if 'Ticket' not in _cached_dataset['columns']:
        raise ValueError('The active ticket dataset is missing the Ticket field.')

    return _cached_dataset


def cache_active_ticket_dataset(content):
    global _cached_dataset

    save_active_tickets_csv(content)
    _cached_dataset = _parse_csv_bytes(content)

    if 'Ticket' not in _cached_dataset['columns']:
        raise ValueError('The active ticket dataset is missing the Ticket field.')

    return _cached_dataset


def get_ticket_by_id(ticket_id):
    dataset = load_active_ticket_dataset()

    if not dataset:
        return None

    for row in dataset['rows']:
        if str(row.get('Ticket', '')).strip() == ticket_id:
            return row

    return None

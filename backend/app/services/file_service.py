import os
from datetime import datetime, timezone
from pathlib import Path

from flask import current_app


TEXT_PREVIEW_EXTENSIONS = {
    '.txt', '.log', '.md', '.json', '.csv', '.xml', '.yaml', '.yml', '.meta.json'
}
CSV_ANALYSIS_EXTENSIONS = {'.csv', '.json', '.txt'}


def _data_dir():
    base = str(current_app.config.get('BACKEND_DATA_DIR', '/app/data')).strip() or '/app/data'
    os.makedirs(base, exist_ok=True)
    return base


def _scan_roots():
    base = _data_dir()
    return [
        ('uploads', os.path.join(base, 'uploads')),
        ('kb', os.path.join(base, 'kb')),
        ('csv_analyses', os.path.join(base, 'csv_analyses')),
    ]


def _file_type(name):
    lower = str(name or '').lower()
    if lower.endswith('.meta.json'):
        return 'meta'
    suffix = Path(lower).suffix.lstrip('.')
    return suffix or 'file'


def _status_for(source, path, name):
    if source == 'csv_analyses':
        return 'Processed'

    if source == 'kb' and name == 'metadata.json':
        try:
            import json

            with open(path, 'r', encoding='utf-8') as handle:
                parsed = json.load(handle)
                status = str(parsed.get('status') or '').strip().lower()
                if status == 'complete':
                    return 'Processed'
                if status == 'processing':
                    return 'Pending'
                if status:
                    return status.title()
        except Exception:
            return 'Pending'

    if str(name or '').endswith('.meta.json'):
        return 'Processed'
    return 'New'


def _read_text_preview(path, max_chars=6000):
    lower = str(path).lower()
    if not any(lower.endswith(ext) for ext in TEXT_PREVIEW_EXTENSIONS):
        return ''
    try:
        with open(path, 'r', encoding='utf-8', errors='replace') as handle:
            content = handle.read(max_chars)
            if handle.read(1):
                content = f'{content}\n...'
            return content
    except OSError:
        return ''


def _safe_relative(path):
    base = _data_dir()
    try:
        return os.path.relpath(path, base)
    except ValueError:
        return path


def _build_file_id(source, relative_path):
    normalized = str(relative_path or '').replace('\\', '/').lstrip('/')
    return f'{source}/{normalized}'


def list_all_files():
    files = []
    for source, root in _scan_roots():
        if not os.path.isdir(root):
            continue

        for dirpath, _dirnames, filenames in os.walk(root):
            for filename in filenames:
                absolute_path = os.path.join(dirpath, filename)
                try:
                    modified = os.path.getmtime(absolute_path)
                except OSError:
                    modified = 0

                relative_path = _safe_relative(absolute_path)
                item = {
                    'id': _build_file_id(source, os.path.relpath(absolute_path, root)),
                    'name': filename,
                    'path': absolute_path,
                    'relativePath': relative_path,
                    'source': source,
                    'type': _file_type(filename),
                    'modified': datetime.fromtimestamp(modified, tz=timezone.utc).isoformat() if modified else None,
                    'status': _status_for(source, absolute_path, filename),
                    'contentPreview': _read_text_preview(absolute_path),
                }
                files.append(item)

    files.sort(key=lambda item: item.get('modified') or '', reverse=True)
    return files


def resolve_file_by_id(file_id):
    raw = str(file_id or '').strip().replace('\\', '/').lstrip('/')
    if not raw or '/' not in raw:
        return None

    source, relative = raw.split('/', 1)
    source = source.strip()
    relative = relative.strip().lstrip('/')
    if source not in {'uploads', 'kb', 'csv_analyses'} or not relative:
        return None

    root = dict(_scan_roots()).get(source)
    if not root:
        return None

    path = os.path.normpath(os.path.join(root, relative))
    if not path.startswith(os.path.normpath(root)):
        return None

    if not os.path.isfile(path):
        return None

    return {
        'id': f'{source}/{relative}',
        'source': source,
        'relative': relative,
        'path': path,
        'name': os.path.basename(path),
    }


def delete_file_by_id(file_id):
    resolved = resolve_file_by_id(file_id)
    if not resolved:
        return False
    os.remove(resolved['path'])
    return True


def should_allow_kb_reprocess(file_id):
    resolved = resolve_file_by_id(file_id)
    if not resolved:
        return False
    ext = Path(resolved['name']).suffix.lower()
    return ext in CSV_ANALYSIS_EXTENSIONS or ext in {'.txt', '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.md', '.log'}

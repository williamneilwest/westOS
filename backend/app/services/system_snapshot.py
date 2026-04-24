import json
import os
from pathlib import Path

from flask import current_app


def _data_dir():
    configured = str(current_app.config.get('BACKEND_DATA_DIR', '/app/data')).strip() or '/app/data'
    os.makedirs(configured, exist_ok=True)
    return configured


def _list_relative_files(directory):
    root = Path(directory)
    if not root.exists() or not root.is_dir():
        return []

    items = []
    for path in sorted(root.rglob('*')):
        if not path.is_file():
            continue
        try:
            relative = str(path.relative_to(root))
        except ValueError:
            relative = path.name
        items.append(relative)
    return items


def _backend_routes():
    routes = []
    for rule in current_app.url_map.iter_rules():
        methods = sorted([method for method in rule.methods if method not in {'HEAD', 'OPTIONS'}])
        routes.append(
            {
                'path': str(rule.rule),
                'endpoint': str(rule.endpoint),
                'methods': methods,
            }
        )
    routes.sort(key=lambda item: item['path'])
    return routes


def _agents_payload(data_dir):
    path = Path(data_dir) / 'agents.json'
    if not path.exists():
        return []
    try:
        with path.open('r', encoding='utf-8') as handle:
            parsed = json.load(handle)
            return parsed if isinstance(parsed, list) else []
    except (OSError, json.JSONDecodeError):
        return []


def generate_system_snapshot():
    data_dir = _data_dir()
    uploads_dir = os.path.join(data_dir, 'uploads')
    kb_dir = os.path.join(data_dir, 'kb')
    csv_analyses_dir = os.path.join(data_dir, 'csv_analyses')

    return {
        'backend_routes': _backend_routes(),
        'data_directories': {
            'root': data_dir,
            'uploads': uploads_dir,
            'kb': kb_dir,
            'csv_analyses': csv_analyses_dir,
        },
        'files': {
            'uploads': _list_relative_files(uploads_dir),
            'kb': _list_relative_files(kb_dir),
            'csv_analyses': _list_relative_files(csv_analyses_dir),
        },
        'agents': _agents_payload(data_dir),
    }

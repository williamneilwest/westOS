import json
import logging
import os
from datetime import datetime, timezone

from flask import Blueprint, current_app, jsonify


kb_processed_bp = Blueprint('kb_processed', __name__)
LOGGER = logging.getLogger(__name__)


def _processed_dir():
    base_dir = current_app.config.get('BACKEND_DATA_DIR', '/app/data')
    path = os.path.join(base_dir, 'kb', 'processed')
    os.makedirs(path, exist_ok=True)
    return path


@kb_processed_bp.get('/api/kb/processed')
def list_processed_kb():
    items = []

    try:
        names = sorted(os.listdir(_processed_dir()))
    except OSError:
        names = []

    for name in names:
        if not name.endswith('.json'):
            continue

        full_path = os.path.join(_processed_dir(), name)
        if not os.path.isfile(full_path):
            continue

        try:
            with open(full_path, 'r', encoding='utf-8') as handle:
                payload = json.load(handle)
        except (OSError, json.JSONDecodeError):
            LOGGER.warning('Skipping unreadable processed KB file: %s', name)
            continue

        try:
            modified_ts = os.path.getmtime(full_path)
        except OSError:
            modified_ts = 0

        items.append(
            {
                'filename': name,
                'title': payload.get('title') or '',
                'summary': payload.get('summary') or '',
                'category': payload.get('category') or '',
                'modifiedAt': datetime.fromtimestamp(modified_ts, tz=timezone.utc).isoformat() if modified_ts else None,
            }
        )

    items.sort(key=lambda item: (item.get('modifiedAt') or ''), reverse=True)
    return jsonify(items)


@kb_processed_bp.get('/api/kb/processed/<path:filename>')
def get_processed_kb(filename):
    path = os.path.join(_processed_dir(), filename)
    if not os.path.isfile(path):
        return jsonify({'error': 'Processed KB document not found.'}), 404

    try:
        with open(path, 'r', encoding='utf-8') as handle:
            payload = json.load(handle)
    except (OSError, json.JSONDecodeError):
        return jsonify({'error': 'Processed KB document could not be read.'}), 500

    return jsonify(payload if isinstance(payload, dict) else {})

import json
import re

from flask import Blueprint, current_app, jsonify, request
from requests import RequestException

from ..services.ai_client import build_compat_chat_response, call_gateway_chat
from ..services.authz import get_current_user, require_admin
from ..services.code_staging_service import apply_stage, reject_stage, stage_changes


dev_bp = Blueprint('dev', __name__)


def _designer_enabled():
    return bool(current_app.config.get('APP_DESIGNER_ENABLED', False))


def _extract_json_block(raw_text):
    text = str(raw_text or '').strip()
    if not text:
        return {}

    fenced_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', text, flags=re.IGNORECASE)
    if fenced_match:
        text = fenced_match.group(1).strip()

    start = text.find('{')
    end = text.rfind('}')
    if start != -1 and end != -1 and end > start:
        text = text[start:end + 1]

    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        return {}


def _normalize_files(raw_files):
    normalized = []
    for item in raw_files if isinstance(raw_files, list) else []:
        if not isinstance(item, dict):
            continue
        path = str(item.get('path') or '').strip()
        if not path:
            continue
        normalized.append(
            {
                'path': path,
                'diff': str(item.get('diff') or ''),
                'new_content': str(item.get('new_content') if item.get('new_content') is not None else ''),
            }
        )
    return normalized


@dev_bp.post('/api/dev/codex/run')
def dev_codex_run():
    admin_error = require_admin()
    if admin_error is not None:
        return admin_error

    if not _designer_enabled():
        return jsonify({'success': False, 'error': 'App Designer is disabled'}), 403

    payload = request.get_json(silent=True) or {}
    prompt = str(payload.get('prompt') or '').strip()
    if not prompt:
        return jsonify({'success': False, 'error': 'prompt is required'}), 400

    codex_prompt = (
        'You are App Designer Codex for a React + Flask project. '
        'Return ONLY JSON with this schema: '
        '{"summary":"string","files":[{"path":"relative/path","diff":"optional unified diff","new_content":"full file text"}]}. '
        'Do not include markdown.\n\n'
        f'User request:\n{prompt}'
    )

    try:
        result = call_gateway_chat(
            {'message': codex_prompt, 'analysis_mode': 'preview'},
            current_app.config['AI_GATEWAY_BASE_URL'],
        )
        compat = build_compat_chat_response({'message': codex_prompt}, result)
        raw_message = str(compat.get('message') or '').strip()
    except (RequestException, ValueError) as error:
        return jsonify({'success': False, 'error': str(error)}), 502

    parsed = _extract_json_block(raw_message)
    summary = str(parsed.get('summary') or raw_message or 'No summary returned.').strip()
    files = _normalize_files(parsed.get('files'))

    current_user = get_current_user()
    staged = stage_changes(summary, files, requested_by=getattr(current_user, 'username', ''))

    return jsonify(
        {
            'success': True,
            'summary': staged.get('summary') or summary,
            'stage_id': staged.get('stage_id'),
            'files': staged.get('files') or [],
            'raw_response': raw_message,
        }
    )


@dev_bp.post('/api/dev/codex/apply')
def dev_codex_apply():
    admin_error = require_admin()
    if admin_error is not None:
        return admin_error

    if not _designer_enabled():
        return jsonify({'success': False, 'error': 'App Designer is disabled'}), 403

    payload = request.get_json(silent=True) or {}
    stage_id = str(payload.get('stage_id') or '').strip()
    approved_files = payload.get('approved_files') if isinstance(payload.get('approved_files'), list) else []

    if not stage_id:
        return jsonify({'success': False, 'error': 'stage_id is required'}), 400

    try:
        result = apply_stage(stage_id, approved_files)
    except ValueError as error:
        return jsonify({'success': False, 'error': str(error)}), 400
    except Exception as error:
        return jsonify({'success': False, 'error': str(error)}), 500

    return jsonify({'success': True, **result})


@dev_bp.post('/api/dev/codex/reject')
def dev_codex_reject():
    admin_error = require_admin()
    if admin_error is not None:
        return admin_error

    if not _designer_enabled():
        return jsonify({'success': False, 'error': 'App Designer is disabled'}), 403

    payload = request.get_json(silent=True) or {}
    stage_id = str(payload.get('stage_id') or '').strip()
    if not stage_id:
        return jsonify({'success': False, 'error': 'stage_id is required'}), 400

    result = reject_stage(stage_id)
    return jsonify({'success': True, **result})

from __future__ import annotations

from flask import Blueprint, jsonify, request

from ..services.authz import RUN_FLOWS_READ, RUN_FLOWS_WRITE, get_current_user, require_permission
from ..services.flow_runs import get_flow_run, list_flow_runs
from ..services.flow_templates import (
    create_flow_template,
    delete_flow_template,
    get_flow_template,
    list_flow_templates,
    run_flow_template,
    update_flow_template,
)


flows_bp = Blueprint('flows', __name__)


@flows_bp.get('/api/flows/runs')
def get_runs():
    permission_error = require_permission(RUN_FLOWS_READ)
    if permission_error is not None:
        return permission_error

    user = get_current_user()
    role = str(getattr(user, 'role', '') or '').strip().lower()
    user_id = int(user.id) if user is not None else None
    is_admin = role == 'admin'

    items = list_flow_runs(
        user_id=user_id,
        is_admin=is_admin,
        flow_name=str(request.args.get('flow_name') or '').strip(),
        status=str(request.args.get('status') or '').strip(),
        owner=str(request.args.get('owner') or '').strip(),
        limit=int(request.args.get('limit') or 100),
    )
    return jsonify({'success': True, 'items': items})


@flows_bp.get('/api/flows/runs/<int:run_id>')
def get_run(run_id):
    permission_error = require_permission(RUN_FLOWS_READ)
    if permission_error is not None:
        return permission_error

    item = get_flow_run(run_id)
    if item is None:
        return jsonify({'success': False, 'error': 'Flow run not found'}), 404
    return jsonify({'success': True, 'item': item})


@flows_bp.get('/api/flows/templates')
def get_templates():
    permission_error = require_permission(RUN_FLOWS_READ)
    if permission_error is not None:
        return permission_error

    return jsonify({'success': True, 'items': list_flow_templates()})


@flows_bp.post('/api/flows/templates')
def post_template():
    permission_error = require_permission(RUN_FLOWS_WRITE)
    if permission_error is not None:
        return permission_error

    payload = request.get_json(silent=True) or {}
    try:
        item = create_flow_template(payload)
    except ValueError as error:
        return jsonify({'success': False, 'error': str(error)}), 400
    return jsonify({'success': True, 'item': item}), 201


@flows_bp.put('/api/flows/templates/<int:template_id>')
def put_template(template_id):
    permission_error = require_permission(RUN_FLOWS_WRITE)
    if permission_error is not None:
        return permission_error

    payload = request.get_json(silent=True) or {}
    try:
        item = update_flow_template(template_id, payload)
    except ValueError as error:
        return jsonify({'success': False, 'error': str(error)}), 400

    if item is None:
        return jsonify({'success': False, 'error': 'Flow template not found'}), 404
    return jsonify({'success': True, 'item': item})


@flows_bp.delete('/api/flows/templates/<int:template_id>')
def remove_template(template_id):
    permission_error = require_permission(RUN_FLOWS_WRITE)
    if permission_error is not None:
        return permission_error

    if not delete_flow_template(template_id):
        return jsonify({'success': False, 'error': 'Flow template not found'}), 404
    return jsonify({'success': True, 'deleted': True})


@flows_bp.post('/api/flows/templates/<int:template_id>/run')
def post_template_run(template_id):
    permission_error = require_permission(RUN_FLOWS_WRITE)
    if permission_error is not None:
        return permission_error

    payload = request.get_json(silent=True) or {}
    variables = payload.get('variables') if isinstance(payload.get('variables'), dict) else {}
    user = get_current_user()
    user_id = int(user.id) if user is not None else None
    try:
        item = run_flow_template(template_id, variables, user_id=user_id)
    except ValueError as error:
        return jsonify({'success': False, 'error': str(error)}), 400
    except Exception as error:
        return jsonify({'success': False, 'error': str(error)}), 502

    return jsonify({'success': True, 'item': item})


@flows_bp.get('/api/flows/templates/<int:template_id>')
def get_template(template_id):
    permission_error = require_permission(RUN_FLOWS_READ)
    if permission_error is not None:
        return permission_error

    item = get_flow_template(template_id)
    if item is None:
        return jsonify({'success': False, 'error': 'Flow template not found'}), 404
    return jsonify({'success': True, 'item': item})

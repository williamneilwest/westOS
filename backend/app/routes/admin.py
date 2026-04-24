from flask import Blueprint, jsonify, request

from ..services.auth_store import list_users, update_user
from ..services.authz import (
    MANAGE_USERS,
    get_current_user,
    require_admin,
    require_permission,
)
from ..services.flow_control import get_registered_flows, run_registered_flow
from ..services.flow_templates import (
    create_flow_template,
    list_flow_templates,
    run_flow_definition,
    run_flow_template,
    update_flow_template,
)


admin_bp = Blueprint('admin', __name__)


@admin_bp.get('/api/admin/flows')
def admin_list_flows():
    admin_error = require_admin()
    if admin_error is not None:
        return admin_error

    return jsonify({'success': True, 'items': get_registered_flows()})


@admin_bp.post('/api/admin/flows/run')
def admin_run_flow():
    admin_error = require_admin()
    if admin_error is not None:
        return admin_error

    payload = request.get_json(silent=True) or {}
    flow_name = str(payload.get('flow_name') or '').strip()
    variables = payload.get('variables') if isinstance(payload.get('variables'), dict) else {}

    if not flow_name:
        return jsonify({'success': False, 'error': 'flow_name is required'}), 400

    user = get_current_user()
    user_id = int(user.id) if user is not None else None
    try:
        result = run_registered_flow(flow_name, variables, user_id=user_id)
    except ValueError as error:
        return jsonify({'success': False, 'error': str(error)}), 400
    except Exception as error:
        return jsonify({'success': False, 'error': str(error)}), 502

    return jsonify({'success': True, 'item': result})


@admin_bp.get('/api/admin/flow-templates')
def admin_list_flow_templates():
    admin_error = require_admin()
    if admin_error is not None:
        return admin_error

    return jsonify({'success': True, 'items': list_flow_templates()})


@admin_bp.post('/api/admin/flow-templates')
def admin_create_flow_template():
    admin_error = require_admin()
    if admin_error is not None:
        return admin_error

    payload = request.get_json(silent=True) or {}
    try:
        item = create_flow_template(payload)
    except ValueError as error:
        return jsonify({'success': False, 'error': str(error)}), 400

    return jsonify({'success': True, 'item': item})


@admin_bp.put('/api/admin/flow-templates/<int:template_id>')
def admin_update_flow_template(template_id):
    admin_error = require_admin()
    if admin_error is not None:
        return admin_error

    payload = request.get_json(silent=True) or {}
    item = update_flow_template(template_id, payload)
    if item is None:
        return jsonify({'success': False, 'error': 'Flow template not found'}), 404

    return jsonify({'success': True, 'item': item})


@admin_bp.post('/api/admin/flow-templates/<int:template_id>/run')
def admin_run_flow_template(template_id):
    admin_error = require_admin()
    if admin_error is not None:
        return admin_error

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


@admin_bp.post('/api/admin/flow-templates/run')
def admin_run_flow_template_adhoc():
    admin_error = require_admin()
    if admin_error is not None:
        return admin_error

    payload = request.get_json(silent=True) or {}
    template = payload.get('template') if isinstance(payload.get('template'), dict) else {}
    variables = payload.get('variables') if isinstance(payload.get('variables'), dict) else {}
    user = get_current_user()
    user_id = int(user.id) if user is not None else None
    try:
        item = run_flow_definition(template, variables, user_id=user_id)
    except ValueError as error:
        return jsonify({'success': False, 'error': str(error)}), 400
    except Exception as error:
        return jsonify({'success': False, 'error': str(error)}), 502

    return jsonify({'success': True, 'item': item})


@admin_bp.get('/api/admin/users')
def admin_list_users():
    permission_error = require_permission(MANAGE_USERS)
    if permission_error is not None:
        return permission_error

    items = list_users()
    return jsonify(
        {
            'success': True,
            'items': [
                {
                    'id': int(user.id),
                    'username': user.username,
                    'role': str(user.role or 'user'),
                    'is_active': bool(user.is_active),
                    'created_at': user.created_at.isoformat() if user.created_at else None,
                }
                for user in items
            ],
        }
    )


@admin_bp.put('/api/admin/users/<int:user_id>')
def admin_update_user(user_id):
    permission_error = require_permission(MANAGE_USERS)
    if permission_error is not None:
        return permission_error

    payload = request.get_json(silent=True) or {}
    role = payload.get('role') if 'role' in payload else None
    is_active = payload.get('is_active') if 'is_active' in payload else None

    try:
        updated = update_user(user_id, role=role, is_active=is_active)
    except ValueError as error:
        return jsonify({'success': False, 'error': str(error)}), 400

    if updated is None:
        return jsonify({'success': False, 'error': 'User not found'}), 404

    return jsonify(
        {
            'success': True,
            'item': {
                'id': int(updated.id),
                'username': updated.username,
                'role': str(updated.role or 'user'),
                'is_active': bool(updated.is_active),
                'created_at': updated.created_at.isoformat() if updated.created_at else None,
            },
        }
    )

from __future__ import annotations

from flask import Blueprint, jsonify, request, session

from ..services.auth_store import (
    ALLOWED_ROLES,
    create_user,
    delete_user,
    get_user_by_username,
    list_users,
    update_user,
    verify_user_password,
)
from ..services.authz import MANAGE_USERS, get_permissions_for_role, require_permission


auth_bp = Blueprint('auth', __name__)


def _serialize_user(user):
    role = str(getattr(user, 'role', 'user') or 'user').strip().lower() or 'user'
    permissions = sorted(get_permissions_for_role(role))
    return {
        'id': int(user.id),
        'username': user.username,
        'role': role,
        'is_active': bool(getattr(user, 'is_active', False)),
        'permissions': permissions,
        'can_execute_flows': any(permission.startswith('RUN_FLOWS') for permission in permissions),
        'created_at': user.created_at.isoformat() if getattr(user, 'created_at', None) else None,
    }


@auth_bp.post('/api/auth/login')
def login():
    payload = request.get_json(silent=True) or {}
    username = str(payload.get('username') or '').strip()
    password = str(payload.get('password') or '')

    user = get_user_by_username(username)
    if user is None or not bool(getattr(user, 'is_active', False)) or not verify_user_password(user, password):
        return jsonify({'success': False, 'error': 'Invalid username or password'}), 401

    session['user_id'] = int(user.id)
    session['role'] = str(user.role or 'user').strip().lower() or 'user'
    session.permanent = True
    return jsonify({'success': True, 'authenticated': True, 'user': _serialize_user(user)})


@auth_bp.post('/api/auth/logout')
def logout():
    session.pop('user_id', None)
    session.pop('role', None)
    return jsonify({'success': True, 'logged_out': True, 'authenticated': False})


@auth_bp.get('/api/auth/me')
def me():
    user_id = int(session.get('user_id') or 0)
    if user_id <= 0:
        return jsonify({'success': True, 'authenticated': False, 'user': None})

    from ..services.authz import get_current_user

    user = get_current_user()
    if user is None:
        session.pop('user_id', None)
        session.pop('role', None)
        return jsonify({'success': True, 'authenticated': False, 'user': None})

    return jsonify({'success': True, 'authenticated': True, 'user': _serialize_user(user)})


@auth_bp.get('/api/users')
def get_users():
    permission_error = require_permission(MANAGE_USERS)
    if permission_error is not None:
        return permission_error

    return jsonify({'success': True, 'items': [_serialize_user(user) for user in list_users()]})


@auth_bp.post('/api/users')
def post_users():
    permission_error = require_permission(MANAGE_USERS)
    if permission_error is not None:
        return permission_error

    payload = request.get_json(silent=True) or {}
    username = str(payload.get('username') or '').strip()
    password = str(payload.get('password') or '')
    role = str(payload.get('role') or 'user').strip().lower() or 'user'

    if role not in ALLOWED_ROLES:
        return jsonify({'success': False, 'error': 'Role must be admin, user, or readonly.'}), 400

    try:
        user = create_user(username, password, role=role)
    except ValueError as error:
        return jsonify({'success': False, 'error': str(error)}), 400

    return jsonify({'success': True, 'item': _serialize_user(user)}), 201


@auth_bp.put('/api/users/<int:user_id>')
def put_user(user_id):
    permission_error = require_permission(MANAGE_USERS)
    if permission_error is not None:
        return permission_error

    payload = request.get_json(silent=True) or {}
    role = payload.get('role') if 'role' in payload else None
    password = payload.get('password') if 'password' in payload else None
    is_active = payload.get('is_active') if 'is_active' in payload else None

    try:
        user = update_user(user_id, role=role, password=password, is_active=is_active)
    except ValueError as error:
        return jsonify({'success': False, 'error': str(error)}), 400

    if user is None:
        return jsonify({'success': False, 'error': 'User not found'}), 404

    return jsonify({'success': True, 'item': _serialize_user(user)})


@auth_bp.delete('/api/users/<int:user_id>')
def remove_user(user_id):
    permission_error = require_permission(MANAGE_USERS)
    if permission_error is not None:
        return permission_error

    if not delete_user(user_id):
        return jsonify({'success': False, 'error': 'User not found'}), 404

    return jsonify({'success': True, 'deleted': True})

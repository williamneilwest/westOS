import logging

from flask import g, jsonify, session

from .auth_store import get_user_by_id

LOGGER = logging.getLogger(__name__)

MANAGE_USERS = 'MANAGE_USERS'
RUN_FLOWS_WRITE = 'RUN_FLOWS_WRITE'
RUN_FLOWS_READ = 'RUN_FLOWS_READ'
VIEW_FLOW_RUNS = 'VIEW_FLOW_RUNS'
RUN_AI = 'RUN_AI'

ROLE_PERMISSIONS = {
    'admin': {MANAGE_USERS, RUN_FLOWS_WRITE, RUN_FLOWS_READ, VIEW_FLOW_RUNS, RUN_AI},
    'user': {RUN_FLOWS_WRITE, RUN_FLOWS_READ, VIEW_FLOW_RUNS, RUN_AI},
    'readonly': {RUN_FLOWS_READ, VIEW_FLOW_RUNS},
}


def _session_user_id() -> int:
    try:
        return int(session.get('user_id') or 0)
    except (TypeError, ValueError):
        return 0


def _session_role() -> str:
    return str(session.get('role') or '').strip().lower()


def _effective_role() -> str:
    role = _session_role()
    return role if role in ROLE_PERMISSIONS else 'user'


def get_permissions_for_role(role: str) -> set[str]:
    normalized = str(role or '').strip().lower()
    if normalized not in ROLE_PERMISSIONS:
        normalized = 'user'
    return set(ROLE_PERMISSIONS.get(normalized, ROLE_PERMISSIONS['user']))


def get_permissions_for_current_user() -> set[str]:
    return get_permissions_for_role(_effective_role())


def has_permission(permission: str) -> bool:
    return str(permission or '').strip() in get_permissions_for_current_user()


def get_current_user():
    cached = getattr(g, '_current_user', None)
    if cached is not None:
        return cached

    user_id = _session_user_id()
    if user_id <= 0:
        g._current_user = None
        return None

    user = get_user_by_id(user_id)
    if user is None or not bool(getattr(user, 'is_active', False)):
        g._current_user = None
        return None

    g._current_user = user
    return user


def require_auth():
    if get_current_user() is not None:
        return None
    LOGGER.warning('[auth] require_auth failed: missing or invalid session')
    return jsonify({'success': False, 'error': 'Unauthorized'}), 401


def require_admin():
    auth_error = require_auth()
    if auth_error is not None:
        return auth_error

    user = get_current_user()
    role = str(getattr(user, 'role', '') or '').strip().lower()
    if role != 'admin':
        LOGGER.warning('[auth] require_admin failed: role=%s', role or 'unknown')
        return jsonify({'success': False, 'error': 'Forbidden'}), 403
    return None


def require_permission(permission: str):
    auth_error = require_auth()
    if auth_error is not None:
        return auth_error

    if not has_permission(permission):
        LOGGER.warning('[auth] require_permission failed: permission=%s role=%s', permission, _effective_role())
        return jsonify({'success': False, 'error': 'Forbidden'}), 403
    return None


def require_role(required_role: str):
    expected = str(required_role or '').strip().lower()
    if expected == 'admin':
        return require_admin()

    auth_error = require_auth()
    if auth_error is not None:
        return auth_error

    if expected and _session_role() != expected:
        return jsonify({'success': False, 'error': 'Forbidden'}), 403
    return None

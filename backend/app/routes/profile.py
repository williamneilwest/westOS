from flask import Blueprint, jsonify, request

from ..services.authz import get_current_user, require_auth
from ..services.profile_store import get_or_create_user_profile, serialize_profile, update_user_profile


profile_bp = Blueprint('profile', __name__)


@profile_bp.get('/api/profile')
def get_profile():
    auth_error = require_auth()
    if auth_error is not None:
        return auth_error

    user = get_current_user()
    if user is None:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401

    profile = get_or_create_user_profile(int(user.id))
    return jsonify(
        {
            'success': True,
            'profile': serialize_profile(profile),
        }
    )


@profile_bp.put('/api/profile')
def put_profile():
    auth_error = require_auth()
    if auth_error is not None:
        return auth_error

    user = get_current_user()
    if user is None:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401

    payload = request.get_json(silent=True) or {}
    profile = update_user_profile(int(user.id), payload)
    return jsonify(
        {
            'success': True,
            'profile': serialize_profile(profile),
        }
    )

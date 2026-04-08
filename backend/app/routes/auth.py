from __future__ import annotations

from flask import Blueprint, request, session

from ..api_response import error_response, success_response
from ..db import db
from ..models import User


auth_bp = Blueprint('auth', __name__)


@auth_bp.post('/auth/register', strict_slashes=False)
def register():
    payload = request.get_json(silent=True) or {}
    username = str(payload.get('username') or '').strip()
    password = str(payload.get('password') or '')

    if not username:
        return error_response('username is required', 400)
    if len(password) < 8:
        return error_response('password must be at least 8 characters', 400)
    if User.query.filter_by(username=username).first():
        return error_response('username already exists', 409)

    user = User(username=username)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    session['user_id'] = user.id
    return success_response({'user': user.to_dict()}, 201)


@auth_bp.post('/auth/login', strict_slashes=False)
def login():
    payload = request.get_json(silent=True) or {}
    username = str(payload.get('username') or '').strip()
    password = str(payload.get('password') or '')

    user = User.query.filter_by(username=username).first()
    if not user or not user.check_password(password):
        return error_response('Invalid username or password', 401)

    session['user_id'] = user.id
    return success_response({'user': user.to_dict()})


@auth_bp.post('/auth/logout', strict_slashes=False)
def logout():
    session.pop('user_id', None)
    return success_response({'logged_out': True})


@auth_bp.get('/auth/me', strict_slashes=False)
def me():
    user_id = str(session.get('user_id') or '').strip()
    if not user_id:
        return error_response('Not authenticated', 401)
    user = User.query.get(user_id)
    if not user:
        session.pop('user_id', None)
        return error_response('Not authenticated', 401)
    return success_response({'user': user.to_dict()})

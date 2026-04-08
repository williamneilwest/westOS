from __future__ import annotations

import os
from functools import wraps
from typing import Callable, TypeVar

from flask import current_app, g, request, session

from .api_response import error_response
from .db import db
from .models import User

F = TypeVar('F', bound=Callable[..., object])


DISABLE_AUTH_FOR_POSTS = os.getenv('DISABLE_AUTH_FOR_POSTS', 'true').strip().lower() in {'1', 'true', 'yes', 'on'}
AUTOMATION_USERNAME = os.getenv('AUTOMATION_USERNAME', 'power-automate')
AUTOMATION_PASSWORD = os.getenv('AUTOMATION_PASSWORD', 'temporary-dev-password')


def _resolve_user_from_session() -> User | None:
    user_id = str(session.get('user_id') or '').strip()
    if not user_id:
        return None
    return User.query.get(user_id)


def _resolve_or_create_automation_user() -> User:
    user = User.query.filter_by(username=AUTOMATION_USERNAME).first()
    if user:
        return user

    user = User(username=AUTOMATION_USERNAME)
    user.set_password(AUTOMATION_PASSWORD)
    db.session.add(user)
    db.session.commit()
    return user


def auth_required(handler: F) -> F:
    @wraps(handler)
    def wrapped(*args, **kwargs):
        if DISABLE_AUTH_FOR_POSTS and request.method == 'POST':
            user = _resolve_or_create_automation_user()
            g.current_user = user
            current_app.logger.info('[AUTH] POST auth bypass enabled for %s', request.path)
            return handler(*args, **kwargs)

        user = _resolve_user_from_session()
        if not user:
            return error_response('Authentication required', 401)
        g.current_user = user
        return handler(*args, **kwargs)

    return wrapped  # type: ignore[return-value]


def get_current_user() -> User:
    user = getattr(g, 'current_user', None)
    if user is not None:
        return user
    resolved = _resolve_user_from_session()
    if resolved is None:
        raise RuntimeError('No authenticated user in request context')
    g.current_user = resolved
    return resolved


def is_auth_route() -> bool:
    path = request.path or ''
    return path.startswith('/api/auth/')

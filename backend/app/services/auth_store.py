from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from werkzeug.security import check_password_hash, generate_password_hash

from ..models.platform import AuthLog, PlatformUser, SessionLocal, init_platform_db
from ..utils.db_strings import truncate_with_log


LOGGER = logging.getLogger(__name__)
ALLOWED_ROLES = {'admin', 'user', 'readonly'}

try:
    import bcrypt  # type: ignore
except ModuleNotFoundError:
    bcrypt = None


def _utc_now():
    return datetime.now(timezone.utc)


def get_user_by_username(username: str) -> PlatformUser | None:
    normalized = str(username or '').strip()
    if not normalized:
        return None

    init_platform_db()
    session = SessionLocal()
    try:
        return session.query(PlatformUser).filter(PlatformUser.username == normalized).one_or_none()
    finally:
        session.close()


def get_user_by_id(user_id: int) -> PlatformUser | None:
    try:
        normalized = int(user_id or 0)
    except (TypeError, ValueError):
        normalized = 0
    if normalized <= 0:
        return None

    init_platform_db()
    session = SessionLocal()
    try:
        return session.get(PlatformUser, normalized)
    finally:
        session.close()


def count_users() -> int:
    init_platform_db()
    session = SessionLocal()
    try:
        return int(session.query(PlatformUser).count())
    finally:
        session.close()


def create_user(username: str, password: str, role: str = 'user') -> PlatformUser:
    normalized = str(username or '').strip()
    if not normalized:
        raise ValueError('Username is required.')
    if not str(password or '').strip():
        raise ValueError('Password is required.')
    normalized_role = str(role or 'user').strip().lower() or 'user'
    if normalized_role not in ALLOWED_ROLES:
        raise ValueError('Role must be admin, user, or readonly.')

    init_platform_db()
    session = SessionLocal()
    try:
        existing = session.query(PlatformUser).filter(PlatformUser.username == normalized).one_or_none()
        if existing:
            raise ValueError('User already exists.')

        password_hash = generate_password_hash(password)
        user = PlatformUser(
            username=truncate_with_log(normalized, max_length=120, field_name='users.username', logger=LOGGER),
            password_hash=password_hash,
            role=truncate_with_log(normalized_role, max_length=255, field_name='users.role', logger=LOGGER),
            is_active=True,
            created_at=_utc_now(),
            updated_at=_utc_now(),
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        return user
    finally:
        session.close()


def ensure_seed_user(username: str, password: str, role: str = 'admin') -> PlatformUser | None:
    normalized = str(username or '').strip()
    if not normalized or not str(password or '').strip():
        return None

    if count_users() > 0:
        return get_user_by_username(normalized)

    try:
        return create_user(normalized, password, role=role)
    except ValueError:
        return get_user_by_username(normalized)


def verify_user_password(user: PlatformUser, password: str) -> bool:
    candidate = str(password or '')
    stored = str(user.password_hash or '').strip()
    if not stored:
        return False

    # Backward compatibility: support legacy werkzeug hashes while moving to bcrypt.
    if stored.startswith('$2a$') or stored.startswith('$2b$') or stored.startswith('$2y$'):
        if bcrypt is None:
            return False
        try:
            return bcrypt.checkpw(candidate.encode('utf-8'), stored.encode('utf-8'))
        except ValueError:
            return False

    return check_password_hash(stored, candidate)


def list_users() -> list[PlatformUser]:
    init_platform_db()
    session = SessionLocal()
    try:
        return session.query(PlatformUser).order_by(PlatformUser.created_at.asc(), PlatformUser.id.asc()).all()
    finally:
        session.close()


def update_user(user_id: int, *, role: str | None = None, password: str | None = None, is_active: bool | None = None) -> PlatformUser | None:
    try:
        normalized_id = int(user_id or 0)
    except (TypeError, ValueError):
        normalized_id = 0
    if normalized_id <= 0:
        return None

    next_role = None
    if role is not None:
        next_role = str(role or '').strip().lower()
        if next_role not in ALLOWED_ROLES:
            raise ValueError('Role must be admin, user, or readonly.')

    next_password = str(password or '').strip()

    init_platform_db()
    session = SessionLocal()
    try:
        user = session.get(PlatformUser, normalized_id)
        if user is None:
            return None

        if next_role is not None:
            user.role = truncate_with_log(next_role, max_length=255, field_name='users.role', logger=LOGGER)
        if password is not None:
            if not next_password:
                raise ValueError('Password cannot be empty.')
            user.password_hash = generate_password_hash(next_password)
        if is_active is not None:
            user.is_active = bool(is_active)

        user.updated_at = _utc_now()
        session.add(user)
        session.commit()
        session.refresh(user)
        return user
    finally:
        session.close()


def delete_user(user_id: int) -> bool:
    try:
        normalized_id = int(user_id or 0)
    except (TypeError, ValueError):
        normalized_id = 0
    if normalized_id <= 0:
        return False

    init_platform_db()
    session = SessionLocal()
    try:
        user = session.get(PlatformUser, normalized_id)
        if user is None:
            return False
        session.delete(user)
        session.commit()
        return True
    finally:
        session.close()


def log_auth_event(
    *,
    username: str,
    host: str,
    path: str,
    action: str,
    reason: str = '',
    detail: str = '',
):
    init_platform_db()
    session = SessionLocal()
    try:
        entry = AuthLog(
            username=truncate_with_log(
                str(username or '').strip() or 'anonymous',
                max_length=120,
                field_name='auth_logs.username',
                logger=LOGGER,
            ),
            host=truncate_with_log(
                str(host or '').strip().lower(),
                max_length=255,
                field_name='auth_logs.host',
                logger=LOGGER,
            ),
            path=truncate_with_log(
                str(path or '/').strip() or '/',
                max_length=512,
                field_name='auth_logs.path',
                logger=LOGGER,
            ),
            action=truncate_with_log(
                str(action or '').strip() or 'unknown',
                max_length=255,
                field_name='auth_logs.action',
                logger=LOGGER,
            ),
            reason=truncate_with_log(
                str(reason or '').strip(),
                max_length=255,
                field_name='auth_logs.reason',
                logger=LOGGER,
            ),
            detail=str(detail or '').strip() or None,
            created_at=_utc_now(),
        )
        session.add(entry)
        session.commit()
    finally:
        session.close()


def get_auth_summary(window_hours: int = 24):
    window = max(1, int(window_hours or 24))
    cutoff = _utc_now() - timedelta(hours=window)
    init_platform_db()
    session = SessionLocal()
    try:
        rows = (
            session.query(AuthLog)
            .filter(AuthLog.created_at >= cutoff)
            .order_by(AuthLog.created_at.desc(), AuthLog.id.desc())
            .limit(500)
            .all()
        )
        actions = {}
        for row in rows:
            action = str(row.action or 'unknown').strip().lower()
            actions[action] = actions.get(action, 0) + 1
        return {
            'windowHours': window,
            'totalEvents': len(rows),
            'actions': actions,
            'latestEventAt': rows[0].created_at.isoformat() if rows and rows[0].created_at else None,
        }
    finally:
        session.close()

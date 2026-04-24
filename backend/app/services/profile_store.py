from __future__ import annotations

from datetime import datetime, timezone

from ..models.platform import SessionLocal, UserProfile, init_platform_db
from ..utils.db_strings import truncate_with_log


def _utc_now():
    return datetime.now(timezone.utc)


def _normalize_text(value: object, max_length: int = 255, field_name: str = 'user_profiles.value') -> str | None:
    raw = str(value or '').strip()
    if not raw:
        return None
    return truncate_with_log(raw, max_length=max_length, field_name=field_name)


def _normalize_quick_links(value: object) -> list[dict]:
    if not isinstance(value, list):
        return []

    links: list[dict] = []
    for item in value:
        if not isinstance(item, dict):
            continue
        label = str(item.get('label') or '').strip()
        url = str(item.get('url') or '').strip()
        if not label or not url:
            continue
        links.append(
            {
                'label': truncate_with_log(label, max_length=255, field_name='user_profiles.quick_links.label'),
                'url': truncate_with_log(url, max_length=1024, field_name='user_profiles.quick_links.url'),
            }
        )
    return links[:25]


def get_or_create_user_profile(user_id: int) -> UserProfile:
    normalized_user_id = int(user_id or 0)
    if normalized_user_id <= 0:
        raise ValueError('user_id is required')

    init_platform_db()
    session = SessionLocal()
    try:
        profile = session.query(UserProfile).filter(UserProfile.user_id == normalized_user_id).one_or_none()
        if profile is None:
            profile = UserProfile(
                user_id=normalized_user_id,
                quick_links=[],
                created_at=_utc_now(),
                updated_at=_utc_now(),
            )
            session.add(profile)
            session.commit()
            session.refresh(profile)
        return profile
    finally:
        session.close()


def update_user_profile(user_id: int, payload: dict | None = None) -> UserProfile:
    normalized_user_id = int(user_id or 0)
    if normalized_user_id <= 0:
        raise ValueError('user_id is required')

    next_payload = payload if isinstance(payload, dict) else {}
    init_platform_db()
    session = SessionLocal()
    try:
        profile = session.query(UserProfile).filter(UserProfile.user_id == normalized_user_id).one_or_none()
        if profile is None:
            profile = UserProfile(
                user_id=normalized_user_id,
                quick_links=[],
                created_at=_utc_now(),
                updated_at=_utc_now(),
            )
            session.add(profile)
            session.flush()

        profile.preferred_name = _normalize_text(
            next_payload.get('preferred_name'),
            max_length=255,
            field_name='user_profiles.preferred_name',
        )
        profile.site_code = _normalize_text(
            next_payload.get('site_code'),
            max_length=255,
            field_name='user_profiles.site_code',
        )
        profile.site_name = _normalize_text(
            next_payload.get('site_name'),
            max_length=255,
            field_name='user_profiles.site_name',
        )
        profile.default_assignment_group = _normalize_text(
            next_payload.get('default_assignment_group'),
            max_length=255,
            field_name='user_profiles.default_assignment_group',
        )
        profile.default_location = _normalize_text(
            next_payload.get('default_location'),
            max_length=255,
            field_name='user_profiles.default_location',
        )
        profile.quick_links = _normalize_quick_links(next_payload.get('quick_links'))
        profile.updated_at = _utc_now()

        session.add(profile)
        session.commit()
        session.refresh(profile)
        return profile
    finally:
        session.close()


def serialize_profile(profile: UserProfile | None) -> dict:
    if profile is None:
        return {
            'preferred_name': None,
            'site_code': None,
            'site_name': None,
            'default_assignment_group': None,
            'default_location': None,
            'quick_links': [],
        }

    return {
        'preferred_name': profile.preferred_name,
        'site_code': profile.site_code,
        'site_name': profile.site_name,
        'default_assignment_group': profile.default_assignment_group,
        'default_location': profile.default_location,
        'quick_links': profile.quick_links if isinstance(profile.quick_links, list) else [],
    }

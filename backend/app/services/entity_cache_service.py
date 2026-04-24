from datetime import datetime, timedelta, timezone

from ..models.reference import Group, User, UserGroup


def _utc_now():
    return datetime.now(timezone.utc)


def _as_utc(value):
    if value is None or not isinstance(value, datetime):
        return None
    if value.tzinfo is None:
        # Legacy rows may be stored as naive timestamps; treat as UTC.
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def upsert_user(session, user_data):
    opid = str(user_data.get('id') or user_data.get('user_id') or user_data.get('opid') or '').strip()
    if not opid:
        return None

    record = session.get(User, opid)
    if record is None:
        record = User(id=opid)
        session.add(record)

    name = str(user_data.get('name') or '').strip()
    display_name = str(user_data.get('display_name') or user_data.get('displayName') or name).strip()
    email = str(user_data.get('email') or '').strip()
    source = str(user_data.get('source') or '').strip() or 'flow'

    if name:
        record.name = name
    if hasattr(record, 'display_name') and display_name:
        record.display_name = display_name
    if email:
        record.email = email
    if hasattr(record, 'job_title'):
        record.job_title = str(user_data.get('job_title') or user_data.get('jobTitle') or '').strip() or None
    if hasattr(record, 'department'):
        record.department = str(user_data.get('department') or '').strip() or None
    if hasattr(record, 'raw_json') and isinstance(user_data, dict):
        record.raw_json = dict(user_data)
    if hasattr(record, 'updated_at'):
        record.updated_at = _utc_now()
    record.source = source
    record.last_synced = _utc_now()
    return record


def upsert_group(session, group_data):
    group_id = str(group_data.get('group_id') or group_data.get('id') or '').strip()
    if not group_id:
        return None

    record = session.get(Group, group_id)
    if record is None:
        record = Group(id=group_id, name=str(group_data.get('name') or group_id).strip() or group_id)
        session.add(record)
    else:
        name = str(group_data.get('name') or '').strip()
        if name and not str(record.name or '').strip():
            record.name = name
    if hasattr(record, 'description'):
        description = str(group_data.get('description') or '').strip()
        if description:
            record.description = description
    if hasattr(record, 'raw_json') and isinstance(group_data, dict):
        record.raw_json = dict(group_data)
    if hasattr(record, 'updated_at'):
        record.updated_at = _utc_now()
    return record


def link_user_group(session, user_id, group_id, source='flow'):
    normalized_user_id = str(user_id or '').strip()
    normalized_group_id = str(group_id or '').strip()
    if not normalized_user_id or not normalized_group_id:
        return None

    link = session.get(UserGroup, (normalized_user_id, normalized_group_id))
    if link is None:
        link = UserGroup(
            user_id=normalized_user_id,
            group_id=normalized_group_id,
            source=str(source or 'flow').strip() or 'flow',
            last_synced=_utc_now(),
            created_at=_utc_now(),
            updated_at=_utc_now(),
        )
        session.add(link)
    else:
        link.source = str(source or 'flow').strip() or 'flow'
        link.last_synced = _utc_now()
        link.updated_at = _utc_now()
    return link


def replace_user_groups(session, user_id, groups, source='flow'):
    normalized_user_id = str(user_id or '').strip()
    if not normalized_user_id:
        return []

    session.query(UserGroup).filter(UserGroup.user_id == normalized_user_id).delete(synchronize_session=False)
    linked = []
    for group in groups if isinstance(groups, list) else []:
        group_id = str(group.get('group_id') or group.get('id') or '').strip()
        if not group_id:
            continue
        link = link_user_group(session, normalized_user_id, group_id, source=source)
        if link is not None:
            linked.append(link)
    return linked


def get_cached_user_membership(session, user_id, ttl_minutes=15):
    normalized_user_id = str(user_id or '').strip()
    if not normalized_user_id:
        return None

    user = session.get(User, normalized_user_id)
    if user is None or user.last_synced is None:
        return None

    cutoff = _utc_now() - timedelta(minutes=max(1, int(ttl_minutes or 15)))
    last_synced = _as_utc(user.last_synced)
    if last_synced is None:
        return None
    if last_synced < cutoff:
        return None

    links = session.query(UserGroup).filter(UserGroup.user_id == normalized_user_id).all()
    group_ids = [str(link.group_id or '').strip() for link in links if str(link.group_id or '').strip()]
    if not group_ids and links:
        return {'user': user, 'groups': []}

    groups = []
    if group_ids:
        existing = session.query(Group).filter(Group.id.in_(group_ids)).all()
        group_by_id = {str(group.id): group for group in existing}
        for group_id in group_ids:
            group = group_by_id.get(group_id)
            groups.append(
                {
                    'group_id': group_id,
                    'name': (group.name if group is not None else group_id) or group_id,
                    'description': (group.description if group is not None else '') or '',
                    'tags': (group.tags if group is not None else '') or '',
                    'identified': bool(group is not None and group.name and group.name != group_id),
                }
            )
    return {'user': user, 'groups': groups}

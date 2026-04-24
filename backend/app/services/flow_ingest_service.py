from datetime import datetime, timezone

from ..models.reference import Group, SessionLocal, User, UserGroup, init_db
from .data_source_service import register_source


def _utc_now():
    return datetime.now(timezone.utc)


def _ensure_db():
    try:
        init_db()
    except Exception:
        return


def _normalize_group_record(group: dict) -> dict | None:
    if not isinstance(group, dict):
        return None

    group_id = str(
        group.get("id")
        or group.get("groupId")
        or group.get("group_id")
        or group.get("aadGroupId")
        or ""
    ).strip()
    if not group_id:
        return None

    return {
        "id": group_id,
        "name": str(group.get("displayName") or group.get("name") or group_id).strip() or group_id,
        "description": str(group.get("description") or "").strip() or None,
        "raw_json": group.get("raw") if isinstance(group.get("raw"), dict) else group,
    }


def _normalize_user_record(user: dict) -> dict | None:
    if not isinstance(user, dict):
        return None

    user_opid = str(
        user.get("opid")
        or user.get("user_id")
        or user.get("id")
        or user.get("username")
        or ""
    ).strip()
    if not user_opid:
        return None
    user_opid = user_opid.lower()

    display_name = str(
        user.get("display_name")
        or user.get("displayName")
        or user.get("name")
        or ""
    ).strip()
    if display_name and display_name.lower() == user_opid.lower():
        display_name = ""
    email = str(user.get("email") or user.get("mail") or user.get("userPrincipalName") or "").strip() or None
    raw_payload = user.get("raw")
    if not isinstance(raw_payload, dict):
        raw_payload = user.get("raw_json")
    if not isinstance(raw_payload, dict):
        raw_payload = user

    raw_account_enabled = user.get("account_enabled")
    if raw_account_enabled is None:
        raw_account_enabled = user.get("Account Enabled")
    if isinstance(raw_account_enabled, bool):
        account_enabled = raw_account_enabled
    elif raw_account_enabled is None or str(raw_account_enabled).strip() == "":
        account_enabled = None
    else:
        account_enabled = str(raw_account_enabled).strip().lower() == "true"

    return {
        "opid": user_opid,
        "display_name": display_name or None,
        "name": display_name or None,
        "email": email,
        "job_title": str(user.get("jobTitle") or user.get("title") or user.get("job_title") or "").strip() or None,
        "department": str(user.get("department") or "").strip() or None,
        "location": str(user.get("location") or "").strip() or None,
        "account_enabled": account_enabled,
        "raw_json": raw_payload,
        "source": str(user.get("source") or "flow").strip() or "flow",
    }


def cleanup_corrupted_users() -> int:
    _ensure_db()
    session = SessionLocal()
    try:
        deleted = (
            session.query(User)
            .filter(User.email.is_(None))
            .filter(User.display_name.is_(None))
            .delete(synchronize_session=False)
        )
        session.commit()
        return int(deleted or 0)
    finally:
        session.close()


def repair_user_display_names_from_raw() -> int:
    """
    One-time repair:
    If display_name is missing/looks like an ID/email, recover from raw_json.name.
    """
    _ensure_db()
    session = SessionLocal()
    repaired = 0
    try:
        users = session.query(User).all()
        for user in users:
            current = str(getattr(user, "display_name", "") or "").strip()
            raw = getattr(user, "raw_json", None)
            if not isinstance(raw, dict):
                continue

            candidate = str(raw.get("name") or raw.get("displayName") or "").strip()
            if not candidate:
                continue

            looks_like_id = bool(current and current.lower() == str(user.id or "").strip().lower())
            looks_like_email = "@" in current
            missing = not current
            if missing or looks_like_id or looks_like_email:
                user.display_name = candidate
                user.name = candidate
                repaired += 1

        if repaired:
            session.commit()
        return repaired
    finally:
        session.close()


def repair_user_ids_from_email_prefix() -> int:
    """
    One-time repair:
    convert email-like IDs to OPID-like IDs using email local-part, preserving user-group links.
    """
    _ensure_db()
    session = SessionLocal()
    repaired = 0
    try:
        users = session.query(User).all()
        for user in users:
            current_id = str(getattr(user, "id", "") or "").strip()
            if not current_id or ("@" not in current_id and "." not in current_id):
                continue

            email = str(getattr(user, "email", "") or "").strip()
            if not email or "@" not in email:
                continue

            target_id = email.split("@", 1)[0].strip().lower()
            if not target_id or target_id == current_id.lower():
                continue

            existing_target = session.get(User, target_id)
            if existing_target is not None:
                # Skip conflicting migrations.
                continue

            links = session.query(UserGroup).filter(UserGroup.user_id == current_id).all()
            for link in links:
                link.user_id = target_id

            user.id = target_id
            repaired += 1

        if repaired:
            session.commit()
        return repaired
    finally:
        session.close()


def upsert_groups(groups):
    _ensure_db()
    session = SessionLocal()
    try:
        for item in groups if isinstance(groups, list) else []:
            normalized = _normalize_group_record(item)
            if normalized is None:
                continue

            group = session.get(Group, normalized["id"])
            if group is None:
                group = Group(id=normalized["id"])
                session.add(group)

            group.name = normalized["name"]
            group.description = normalized["description"]
            group.raw_json = normalized["raw_json"]
            group.updated_at = _utc_now()

        session.commit()
        row_count = int(session.query(Group).count())
    finally:
        session.close()

    register_source(
        key="groups",
        name="Groups",
        table_name="ref_groups",
        row_count=row_count,
    )


def upsert_users(users):
    _ensure_db()
    session = SessionLocal()
    try:
        for item in users if isinstance(users, list) else []:
            normalized = _normalize_user_record(item)
            if normalized is None:
                continue

            user = session.get(User, normalized["opid"])
            if user is None:
                user = User(id=normalized["opid"])
                session.add(user)

            incoming_display_name = str(normalized.get("display_name") or "").strip()
            if incoming_display_name and incoming_display_name.lower() != str(user.id or "").strip().lower():
                user.display_name = incoming_display_name
                user.name = incoming_display_name

            incoming_email = str(normalized.get("email") or "").strip()
            if incoming_email:
                user.email = incoming_email
            elif not str(getattr(user, "email", "") or "").strip():
                raw_json = normalized.get("raw_json")
                if isinstance(raw_json, dict):
                    fallback_email = str(
                        raw_json.get("email")
                        or raw_json.get("Email")
                        or raw_json.get("mail")
                        or raw_json.get("userPrincipalName")
                        or raw_json.get("Email Address")
                        or ""
                    ).strip()
                    if fallback_email:
                        user.email = fallback_email

            incoming_job_title = str(normalized.get("job_title") or "").strip()
            if incoming_job_title:
                user.job_title = incoming_job_title

            incoming_department = str(normalized.get("department") or "").strip()
            if incoming_department:
                user.department = incoming_department

            incoming_location = str(normalized.get("location") or "").strip()
            if incoming_location:
                user.location = incoming_location

            if "account_enabled" in normalized and normalized.get("account_enabled") is not None:
                user.account_enabled = bool(normalized.get("account_enabled"))

            raw_payload = normalized.get("raw_json")
            if isinstance(raw_payload, dict):
                user.raw_json = raw_payload

            if str(getattr(user, "display_name", "") or "").strip() and "@" in str(user.display_name):
                print("BAD DISPLAY NAME DETECTED:", user.display_name)
            user.source = normalized["source"]
            user.updated_at = _utc_now()
            user.last_synced = _utc_now()

        session.commit()
        row_count = int(session.query(User).count())
    finally:
        session.close()

    register_source(
        key="users",
        name="Users",
        table_name="ref_users",
        row_count=row_count,
    )


def ingest_flow_response(response, script_name: str | None = None):
    # Deprecated generic ingestion path is intentionally disabled.
    if not script_name:
        print("[FLOW INGEST] skipped: script_name is required for strict routing")
        return

    from .flow_router import route_flow_result

    route_flow_result(script_name, response)

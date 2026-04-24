from __future__ import annotations

import json

from .flow_ingest_service import (
    cleanup_corrupted_users,
    repair_user_ids_from_email_prefix,
    repair_user_display_names_from_raw,
    upsert_groups,
    upsert_users,
)
from ..utils.flow_normalizer import normalize_user_profile_response

_cleanup_done = False
_id_repair_done = False
_repair_done = False


def _normalize_script_name(script_name: str) -> str:
    return "".join(ch for ch in str(script_name or "").lower() if ch.isalnum())


def _extract_dict_payload(data):
    if not isinstance(data, dict):
        return {}
    return data


def _extract_list_payload(data):
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for key in ("items", "value", "groups"):
            value = data.get(key)
            if isinstance(value, list):
                return value
    return []


def _extract_group_ids(value):
    if isinstance(value, list):
        group_ids = []
        for item in value:
            group_ids.extend(_extract_group_ids(item))
        return group_ids
    if isinstance(value, dict):
        group_ids = []
        for nested in value.values():
            group_ids.extend(_extract_group_ids(nested))
        return group_ids
    if isinstance(value, str):
        group_id = str(value or "").strip()
        try:
            parsed = json.loads(group_id)
        except Exception:
            parsed = None
        if parsed is not None and parsed is not value:
            return _extract_group_ids(parsed)
        if not group_id or "metadata" in group_id.lower():
            return []
        return [group_id]
    return []


def handle_user_profile_flow(data):
    payload = _extract_dict_payload(data)
    response_data = payload.get("response", {}).get("data", {}) if isinstance(payload.get("response"), dict) else {}
    username = str(
        response_data.get("username")
        or response_data.get("user_id")
        or response_data.get("opid")
        or response_data.get("id")
        or ""
    ).strip()
    profile = normalize_user_profile_response(payload, username)
    print("[USER PROFILE RAW]", data)
    print("[USER PROFILE NORMALIZED]", profile)

    if not isinstance(profile, dict):
        print("[USER PROFILE] Invalid payload, skipping")
        return

    display_name = str(profile.get("display_name") or "").strip()
    email = str(profile.get("email") or "").strip()
    if not email and not display_name:
        print("[USER PROFILE] Invalid payload, skipping")
        return

    user_opid = str(profile.get("opid") or "").strip().lower()
    if not user_opid:
        print("[USER PROFILE] Missing opid, skipping")
        return

    upsert_users(
        [
            {
                "opid": user_opid,
                "display_name": display_name or None,
                "email": email or None,
                "job_title": str(profile.get("job_title") or "").strip() or None,
                "department": str(profile.get("department") or "").strip() or None,
                "location": str(profile.get("location") or "").strip() or None,
                "account_enabled": profile.get("account_enabled"),
                "raw": profile.get("raw") if isinstance(profile.get("raw"), dict) else payload,
                "source": "flow",
            }
        ]
    )


def handle_groups_flow(data):
    payload = _extract_dict_payload(data)
    items = _extract_list_payload(payload)
    cleaned = []

    for group in items:
        if not isinstance(group, dict):
            continue

        group_id = str(group.get("group_id") or group.get("id") or group.get("groupId") or "").strip()
        has_user_markers = bool(
            str(group.get("email") or group.get("mail") or group.get("userPrincipalName") or "").strip()
        )
        if not group_id:
            continue
        if "metadata" in group_id.lower():
            continue
        if has_user_markers and not str(group.get("group_id") or group.get("groupId") or "").strip():
            # Guardrail: skip probable user records accidentally returned in group payloads.
            continue

        cleaned.append(
            {
                "id": group_id,
                "name": str(group.get("name") or group.get("displayName") or group_id).strip() or group_id,
                "description": str(group.get("description") or "").strip() or None,
                "raw": group,
            }
        )

    if cleaned:
        upsert_groups(cleaned)


def handle_user_groups_flow(data):
    payload = _extract_dict_payload(data)
    user_id = str(
        payload.get("user_opid")
        or payload.get("user_id")
        or payload.get("opid")
        or payload.get("id")
        or ""
    ).strip().lower()

    flow_payload = payload.get("payload")
    group_ids = _extract_group_ids(flow_payload if flow_payload is not None else payload)
    if not user_id or not group_ids:
        print("[USER GROUPS] Missing user or groups, skipping membership upsert")
        return

    from .group_lookup import upsert_user_memberships

    upsert_user_memberships(
        user_id,
        [{"group_id": group_id} for group_id in group_ids],
    )


def route_flow_result(script_name, data):
    global _cleanup_done, _id_repair_done, _repair_done

    if not _cleanup_done:
        removed = cleanup_corrupted_users()
        print(f"[FLOW ROUTER] Corrupted user cleanup removed {removed} rows")
        _cleanup_done = True
    if not _id_repair_done:
        repaired_ids = repair_user_ids_from_email_prefix()
        print(f"[FLOW ROUTER] Repaired {repaired_ids} user IDs from email format")
        _id_repair_done = True
    if not _repair_done:
        repaired = repair_user_display_names_from_raw()
        print(f"[FLOW ROUTER] Repaired {repaired} user display names from raw payload")
        _repair_done = True

    normalized = _normalize_script_name(script_name)
    if normalized == "searchgroups":
        return handle_groups_flow(data)
    if normalized == "getusergroups":
        return handle_user_groups_flow(data)
    if normalized == "getuserprofile":
        return handle_user_profile_flow(data)

    print(f"[FLOW ROUTER] No handler for {script_name}")
    return None

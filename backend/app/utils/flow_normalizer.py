def normalize_user_profile_response(data, username):
    """
    Handles Power Automate wrapped user profile response.
    """
    envelope = data if isinstance(data, dict) else {}
    payload = envelope.get("response", {}).get("data", {}) if isinstance(envelope.get("response"), dict) else {}
    if not isinstance(payload, dict) or not payload:
        return None

    normalized_username = str(username or "").strip().lower()
    if not normalized_username:
        return None

    return {
        "opid": normalized_username,
        "display_name": str(payload.get("name") or "").strip(),
        "email": str(payload.get("email") or "").strip(),
        "job_title": str(payload.get("title") or "").strip(),
        "department": str(payload.get("department") or "").strip(),
        "location": str(payload.get("location") or "").strip(),
        "account_enabled": str(payload.get("Account Enabled") or "").strip().lower() == "true",
        "raw": payload,
    }

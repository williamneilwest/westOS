import json
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path

from flask import current_app


MAX_NAME_LENGTH = 120
MAX_DESCRIPTION_LENGTH = 500
MAX_BODY_LENGTH = 20000
MAX_VARIABLES = 20
VARIABLE_KEY_PATTERN = re.compile(r"^[A-Za-z][A-Za-z0-9_]{0,39}$")
VARIABLE_TOKEN_PATTERN = re.compile(r"{{\s*([A-Za-z][A-Za-z0-9_]{0,39})\s*}}")


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _backend_data_dir() -> Path:
    configured = str(current_app.config.get("BACKEND_DATA_DIR") or "/app/data").strip() or "/app/data"
    return Path(configured)


def _scripts_storage_dir() -> Path:
    return _backend_data_dir() / "scripts"


def _scripts_index_path() -> Path:
    return _scripts_storage_dir() / "scripts.json"


def _ensure_storage() -> None:
    _scripts_storage_dir().mkdir(parents=True, exist_ok=True)


def _load_records() -> list[dict]:
    _ensure_storage()
    index_path = _scripts_index_path()
    if not index_path.exists():
        return []
    try:
        payload = json.loads(index_path.read_text(encoding="utf-8"))
    except Exception:
        return []
    if not isinstance(payload, list):
        return []
    return [item for item in payload if isinstance(item, dict)]


def _save_records(records: list[dict]) -> None:
    _ensure_storage()
    _scripts_index_path().write_text(json.dumps(records, indent=2), encoding="utf-8")


def _text(value: object) -> str:
    return str(value or "").strip()


def _normalize_variable(raw_variable: object) -> dict:
    if not isinstance(raw_variable, dict):
        raise ValueError("Each variable must be an object.")

    key = _text(raw_variable.get("key"))
    if not key:
        raise ValueError("Variable key is required.")
    if not VARIABLE_KEY_PATTERN.match(key):
        raise ValueError("Variable keys must start with a letter and use only letters, numbers, or underscores.")

    label = _text(raw_variable.get("label")) or key
    return {
        "key": key,
        "label": label[:80],
        "placeholder": _text(raw_variable.get("placeholder"))[:120],
        "default": _text(raw_variable.get("default"))[:500],
    }


def _variables_from_body(body: str) -> list[dict]:
    keys = []
    seen = set()
    for match in VARIABLE_TOKEN_PATTERN.finditer(body):
        key = match.group(1)
        if key in seen:
            continue
        keys.append(key)
        seen.add(key)
    return [{"key": key, "label": _label_from_key(key), "placeholder": "", "default": ""} for key in keys]


def _label_from_key(key: str) -> str:
    spaced = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", key).replace("_", " ")
    return " ".join(part.capitalize() for part in spaced.split()) or key


def _normalize_variables(raw_variables: object, body: str) -> list[dict]:
    if raw_variables is None:
        return _variables_from_body(body)
    if not isinstance(raw_variables, list):
        raise ValueError("variables must be a list.")
    if len(raw_variables) > MAX_VARIABLES:
        raise ValueError(f"scripts can have at most {MAX_VARIABLES} variables.")

    normalized = []
    seen = set()
    for raw_variable in raw_variables:
        variable = _normalize_variable(raw_variable)
        key = variable["key"]
        if key in seen:
            continue
        normalized.append(variable)
        seen.add(key)
    return normalized


def _normalize_record_payload(payload: dict, existing: dict | None = None) -> dict:
    if not isinstance(payload, dict):
        raise ValueError("JSON payload is required.")

    current = existing or {}
    name = _text(payload.get("name") if "name" in payload else current.get("name"))
    body = str(payload.get("body") if "body" in payload else current.get("body") or "").strip()
    description = _text(payload.get("description") if "description" in payload else current.get("description"))

    if not name:
        raise ValueError("name is required.")
    if len(name) > MAX_NAME_LENGTH:
        raise ValueError(f"name exceeds {MAX_NAME_LENGTH} characters.")
    if len(description) > MAX_DESCRIPTION_LENGTH:
        raise ValueError(f"description exceeds {MAX_DESCRIPTION_LENGTH} characters.")
    if not body:
        raise ValueError("body is required.")
    if len(body) > MAX_BODY_LENGTH:
        raise ValueError(f"body exceeds {MAX_BODY_LENGTH} characters.")

    raw_variables = payload.get("variables") if "variables" in payload else current.get("variables")
    return {
        "name": name,
        "description": description,
        "body": body,
        "variables": _normalize_variables(raw_variables, body),
    }


def list_scripts(query: str = "") -> list[dict]:
    _ensure_seed_scripts()
    records = _load_records()
    normalized_query = _text(query).lower()
    if not normalized_query:
        return records

    filtered = []
    for record in records:
        haystack = " ".join(
            [
                _text(record.get("name")),
                _text(record.get("description")),
                _text(record.get("body")),
            ]
        ).lower()
        if normalized_query in haystack:
            filtered.append(record)
    return filtered


def create_script(payload: dict) -> dict:
    record_data = _normalize_record_payload(payload)
    now = _utc_now_iso()
    record = {
        "id": str(uuid.uuid4()),
        "created_at": now,
        "updated_at": now,
        **record_data,
    }
    records = _load_records()
    records.insert(0, record)
    _save_records(records)
    return record


def update_script(script_id: str, payload: dict) -> dict | None:
    records = _load_records()
    normalized_id = _text(script_id)
    for index, record in enumerate(records):
        if _text(record.get("id")) != normalized_id:
            continue
        updated = {
            **record,
            **_normalize_record_payload(payload, existing=record),
            "updated_at": _utc_now_iso(),
        }
        records[index] = updated
        _save_records(records)
        return updated
    return None


def delete_script(script_id: str) -> bool:
    records = _load_records()
    normalized_id = _text(script_id)
    next_records = [record for record in records if _text(record.get("id")) != normalized_id]
    if len(next_records) == len(records):
        return False
    _save_records(next_records)
    return True


def _ensure_seed_scripts() -> None:
    records = _load_records()
    if records:
        return

    now = _utc_now_iso()
    records.append(
        {
            "id": str(uuid.uuid4()),
            "name": "Set local device variables",
            "description": "Starter PowerShell snippet using user and hardware inputs.",
            "body": "$UserName = \"{{userName}}\"\n$HardwareName = \"{{hardwareName}}\"\nWrite-Host \"Preparing $HardwareName for $UserName\"",
            "variables": [
                {"key": "userName", "label": "User Name", "placeholder": "jane.doe", "default": ""},
                {"key": "hardwareName", "label": "Hardware Name", "placeholder": "AH-PC-12345", "default": ""},
            ],
            "created_at": now,
            "updated_at": now,
        }
    )
    _save_records(records)

import json
import os


DEFAULT_SOURCE_KEY = "active_tickets"
SETTINGS_FILENAME = "device_location_settings.json"


def _settings_path() -> str:
    data_dir = os.getenv("BACKEND_DATA_DIR", "/app/data")
    return os.path.join(data_dir, SETTINGS_FILENAME)


def _ensure_parent(path: str) -> None:
    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, exist_ok=True)


def get_hardware_lookup_source_key(default: str = DEFAULT_SOURCE_KEY) -> str:
    path = _settings_path()
    try:
        with open(path, "r", encoding="utf-8") as handle:
            payload = json.load(handle)
    except (OSError, json.JSONDecodeError):
        return str(default or DEFAULT_SOURCE_KEY).strip() or DEFAULT_SOURCE_KEY

    key = str((payload or {}).get("hardware_lookup_source_key") or "").strip()
    if key:
        return key
    return str(default or DEFAULT_SOURCE_KEY).strip() or DEFAULT_SOURCE_KEY


def set_hardware_lookup_source_key(source_key: str) -> str:
    normalized = str(source_key or "").strip()
    if not normalized:
        raise ValueError("source_key is required")

    path = _settings_path()
    _ensure_parent(path)
    payload = {"hardware_lookup_source_key": normalized}
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)
    return normalized


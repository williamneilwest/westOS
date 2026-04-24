import json
import os
from pathlib import Path

from flask import current_app, has_app_context


def _kb_root_dir():
    if has_app_context():
        base_dir = str(current_app.config.get("BACKEND_DATA_DIR", "/app/data")).strip() or "/app/data"
    else:
        base_dir = str(os.getenv("BACKEND_DATA_DIR", "/app/data")).strip() or "/app/data"
    kb_dir = Path(base_dir) / "kb"
    kb_dir.mkdir(parents=True, exist_ok=True)
    return kb_dir


def _index_path():
    return _kb_root_dir() / "index.json"


def _read_index():
    path = _index_path()
    if not path.exists():
        return []

    try:
        with path.open("r", encoding="utf-8") as handle:
            parsed = json.load(handle)
            return parsed if isinstance(parsed, list) else []
    except (OSError, json.JSONDecodeError):
        return []


def update_kb_index(doc_id, metadata):
    normalized_doc_id = str(doc_id or "").strip()
    if not normalized_doc_id:
        return

    payload = metadata if isinstance(metadata, dict) else {}
    index = [entry for entry in _read_index() if str(entry.get("doc_id") or "").strip() != normalized_doc_id]
    index.append(
        {
            "doc_id": normalized_doc_id,
            "title": str(payload.get("title") or "").strip(),
            "tags": payload.get("tags") if isinstance(payload.get("tags"), list) else [],
            "systems": payload.get("systems") if isinstance(payload.get("systems"), list) else [],
            "doc_type": str(payload.get("doc_type") or "").strip(),
            "search_hints": payload.get("search_hints") if isinstance(payload.get("search_hints"), list) else [],
        }
    )

    path = _index_path()
    with path.open("w", encoding="utf-8") as handle:
        json.dump(index, handle, ensure_ascii=False, indent=2)

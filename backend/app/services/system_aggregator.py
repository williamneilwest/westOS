import os
import threading
from datetime import datetime, timezone
from pathlib import Path
from time import monotonic

from flask import current_app

from ..models.reference import Endpoint, SessionLocal, init_db
from ..routes.endpoints_registry import sync_endpoints
from ..services.auth_store import get_auth_summary
from ..services.ai_interaction_log import read_ai_interactions
from ..services.file_registry import count_file_metadata
from ..services.runtime_services import list_runtime_services
from ..utils.storage import get_kb_dir, get_processed_kb_dir, get_uploads_dir

_CACHE_LOCK = threading.Lock()
_CACHE_TTL_SECONDS = 45
_CACHE = {
    "expires_at": 0.0,
    "payload": None,
}


def _utc_now_iso():
    return datetime.now(timezone.utc).isoformat()


def _file_count(path: str, extensions: tuple[str, ...] | None = None):
    root = Path(path)
    if not root.exists() or not root.is_dir():
        return 0

    count = 0
    for entry in root.rglob("*"):
        if not entry.is_file():
            continue
        if extensions and entry.suffix.lower() not in extensions:
            continue
        count += 1
    return count


def _collect_endpoints():
    init_db()
    try:
        sync_endpoints()
    except Exception:
        # Endpoint registry should never block system map responses.
        pass

    session = SessionLocal()
    try:
        rows = session.query(Endpoint).order_by(Endpoint.name.asc()).all()
        endpoints = [
            {
                "id": row.id,
                "name": row.name,
                "rule": row.rule,
                "methods": row.methods,
                "description": row.description or "",
            }
            for row in rows
        ]
    finally:
        session.close()

    return endpoints


def _collect_datasets():
    uploads_dir = get_uploads_dir()
    kb_dir = get_kb_dir()
    processed_kb_dir = get_processed_kb_dir()

    uploads_count = _file_count(uploads_dir)
    kb_document_count = 0
    kb_root = Path(kb_dir)
    if kb_root.exists():
        for entry in kb_root.rglob("*"):
            if not entry.is_file():
                continue
            if "processed" in entry.parts:
                continue
            if entry.name.endswith(".meta.json"):
                continue
            kb_document_count += 1
    kb_processed_count = _file_count(processed_kb_dir, extensions=(".json",))
    interaction_log = current_app.config.get("BACKEND_DATA_DIR", "/app/data")
    interaction_path = os.path.join(interaction_log, "ai-interactions.jsonl")

    return {
        "uploads": {
            "path": uploads_dir,
            "count": uploads_count,
        },
        "kb": {
            "path": kb_dir,
            "count": kb_document_count,
            "processedCount": kb_processed_count,
        },
        "aiInteractions": {
            "path": interaction_path,
            "exists": os.path.isfile(interaction_path),
        },
        "fileRegistry": {
            "count": count_file_metadata(),
        },
    }


def _collect_ai():
    items = read_ai_interactions(limit=200)
    provider_counts = {}
    type_counts = {}

    for item in items:
        provider = str(item.get("provider") or "unknown").strip().lower()
        interaction_type = str(item.get("type") or "chat").strip().lower()
        provider_counts[provider] = provider_counts.get(provider, 0) + 1
        type_counts[interaction_type] = type_counts.get(interaction_type, 0) + 1
    error_count = sum(1 for item in items if str(item.get("status") or "ok").strip().lower() not in {"ok", "success"})
    total_count = len(items)

    return {
        "recentInteractionCount": len(items),
        "providers": provider_counts,
        "flows": type_counts,
        "errorCount": error_count,
        "errorRate": round((error_count / total_count), 4) if total_count else 0.0,
        "gateway": {
            "enabled": bool(current_app.config.get("USE_AI_GATEWAY", False)),
            "baseUrl": current_app.config.get("AI_GATEWAY_BASE_URL", ""),
        },
    }


def _collect_features(endpoints):
    endpoint_rules = [endpoint.get("rule") or "" for endpoint in endpoints]

    def _feature_enabled(prefixes):
        return any(any(rule.startswith(prefix) for prefix in prefixes) for rule in endpoint_rules)

    features = [
        {
            "id": "work",
            "name": "Work Module",
            "enabled": _feature_enabled(["/api/tickets", "/api/work", "/flows/work"]),
            "route": "/app/work",
        },
        {
            "id": "data",
            "name": "Data Tools",
            "enabled": _feature_enabled(["/api/data"]),
            "route": "/app/data",
        },
        {
            "id": "kb",
            "name": "Knowledge Base",
            "enabled": _feature_enabled(["/api/kb", "/kb"]),
            "route": "/app/kb",
        },
        {
            "id": "ai",
            "name": "AI Workspace",
            "enabled": _feature_enabled(["/api/ai", "/api/assistant"]),
            "route": "/app/ai",
        },
        {
            "id": "system",
            "name": "System Viewer",
            "enabled": True,
            "route": "/app/system",
        },
    ]

    return features


def _build_map_payload():
    services = list_runtime_services()
    endpoints = _collect_endpoints()
    datasets = _collect_datasets()
    ai = _collect_ai()
    auth = get_auth_summary(window_hours=24)
    features = _collect_features(endpoints)

    return {
        "generatedAt": _utc_now_iso(),
        "services": services,
        "features": features,
        "datasets": datasets,
        "ai": ai,
        "auth": auth,
        "endpoints": endpoints,
        "counts": {
            "services": len(services.get("services") or []),
            "features": len(features),
            "datasets": len(datasets),
            "aiFlows": len(ai.get("flows") or {}),
            "authEvents": int(auth.get("totalEvents") or 0),
            "endpoints": len(endpoints),
        },
    }


def build_system_map(force_refresh=False):
    now = monotonic()

    with _CACHE_LOCK:
        if (
            not force_refresh
            and _CACHE.get("payload") is not None
            and _CACHE.get("expires_at", 0.0) > now
        ):
            return _CACHE["payload"]

    payload = _build_map_payload()

    with _CACHE_LOCK:
        _CACHE["payload"] = payload
        _CACHE["expires_at"] = monotonic() + _CACHE_TTL_SECONDS

    return payload


def clear_system_map_cache():
    with _CACHE_LOCK:
        _CACHE["payload"] = None
        _CACHE["expires_at"] = 0.0

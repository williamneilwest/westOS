import json
import logging
import threading
from datetime import datetime, timezone
from pathlib import Path

from ..models.platform import AIInteraction, SessionLocal, init_platform_db
from ..utils.db_strings import truncate_with_log


_LOCK = threading.Lock()
_MAX_READ_ITEMS = 500
LOGGER = logging.getLogger(__name__)


def _default_log_path():
    return Path("/app/data/ai-interactions.jsonl")


def _utc_now_iso():
    return datetime.now(timezone.utc).isoformat()


def _safe_preview(text, max_length=4000):
    value = str(text or "").strip()
    if len(value) <= max_length:
        return value
    return f"{value[:max_length].rstrip()}..."


def _extract_prompt(payload):
    if not isinstance(payload, dict):
        return ""

    message = str(payload.get("message") or "").strip()
    if message:
        return _safe_preview(message)

    messages = payload.get("messages")
    if isinstance(messages, list):
        parts = []
        for item in messages:
            if not isinstance(item, dict):
                continue
            content = item.get("content")
            if isinstance(content, str) and content.strip():
                role = str(item.get("role") or "user").strip()
                parts.append(f"{role}: {content.strip()}")
        if parts:
            return _safe_preview("\n\n".join(parts))

    return ""


def write_ai_interaction(payload, result, duration_ms, provider="ai-gateway", interaction_type="chat", log_path=None):
    prompt = _extract_prompt(payload)
    if not prompt:
        return

    choices = (result or {}).get("choices") or []
    first_choice = choices[0] if choices else {}
    response_message = ((first_choice.get("message") or {}).get("content") or "").strip()
    usage = (result or {}).get("usage") or {}
    agent_id = str((payload or {}).get("agent_id") or "").strip()
    route_selected = str((payload or {}).get("route_selected") or "").strip()
    source_agent = str((payload or {}).get("source_agent") or agent_id).strip()
    original_user_query = str((payload or {}).get("original_user_query") or "").strip()
    response_type = str((payload or {}).get("response_type") or "").strip()
    analysis_mode = str((payload or {}).get("analysis_mode") or "").strip()
    log_file = Path(log_path) if log_path else _default_log_path()
    log_file.parent.mkdir(parents=True, exist_ok=True)

    entry = {
        "timestamp": _utc_now_iso(),
        "type": str(interaction_type or "chat"),
        "mode": analysis_mode or str(interaction_type or "chat"),
        "agentId": agent_id,
        "provider": provider,
        "model": (result or {}).get("model") or (payload or {}).get("model") or "",
        "prompt": prompt,
        "response": _safe_preview(response_message),
        "tokens": {
            "input": int(usage.get("prompt_tokens") or 0),
            "output": int(usage.get("completion_tokens") or 0),
            "total": int(usage.get("total_tokens") or 0),
        },
        "durationMs": int(duration_ms or 0),
        "status": "ok",
        "error": "",
        "route": route_selected,
        "sourceAgent": source_agent,
        "originalUserQuery": original_user_query,
        "responseType": response_type,
    }

    _write_ai_interaction_db(entry)
    serialized = json.dumps(entry, ensure_ascii=False)
    with _LOCK:
        with log_file.open("a", encoding="utf-8") as handle:
            handle.write(f"{serialized}\n")


def write_ai_interaction_error(payload, error_message, duration_ms=0, provider="ai-gateway", interaction_type="chat"):
    prompt = _extract_prompt(payload)
    agent_id = str((payload or {}).get("agent_id") or "").strip()
    route_selected = str((payload or {}).get("route_selected") or "").strip()
    source_agent = str((payload or {}).get("source_agent") or agent_id).strip()
    original_user_query = str((payload or {}).get("original_user_query") or "").strip()
    response_type = str((payload or {}).get("response_type") or "").strip()
    analysis_mode = str((payload or {}).get("analysis_mode") or "").strip()
    entry = {
        "timestamp": _utc_now_iso(),
        "type": str(interaction_type or "chat"),
        "mode": analysis_mode or str(interaction_type or "chat"),
        "agentId": agent_id,
        "provider": provider,
        "model": (payload or {}).get("model") or "",
        "prompt": prompt,
        "response": "",
        "tokens": {"input": 0, "output": 0, "total": 0},
        "durationMs": int(duration_ms or 0),
        "status": "error",
        "error": _safe_preview(error_message or "", max_length=2000),
        "route": route_selected,
        "sourceAgent": source_agent,
        "originalUserQuery": original_user_query,
        "responseType": response_type,
    }
    _write_ai_interaction_db(entry)


def _encode_source_host(entry):
    agent = str(entry.get("sourceAgent") or entry.get("agentId") or "").strip()
    route = str(entry.get("route") or "").strip()
    response_type = str(entry.get("responseType") or "").strip()
    original_query = _safe_preview(str(entry.get("originalUserQuery") or "").strip(), max_length=120)
    parts = []
    if agent:
        parts.append(f'a={agent}')
    if route:
        parts.append(f'r={route}')
    if response_type:
        parts.append(f't={response_type}')
    if original_query:
        parts.append(f'q={original_query}')
    encoded = ';'.join(parts).strip()
    return encoded or str(entry.get("agentId") or "").strip()


def _decode_source_host(value):
    raw = str(value or "").strip()
    parsed = {
        "agentId": raw,
        "route": "",
        "sourceAgent": raw,
        "responseType": "",
        "originalUserQuery": "",
    }
    if not raw or ';' not in raw or '=' not in raw:
        return parsed

    fields = {}
    for piece in raw.split(';'):
        if '=' not in piece:
            continue
        key, field_value = piece.split('=', 1)
        fields[key.strip()] = field_value.strip()

    if fields:
        parsed["agentId"] = fields.get('a', parsed["agentId"])
        parsed["sourceAgent"] = fields.get('a', parsed["sourceAgent"])
        parsed["route"] = fields.get('r', '')
        parsed["responseType"] = fields.get('t', '')
        parsed["originalUserQuery"] = fields.get('q', '')
    return parsed


def _write_ai_interaction_db(entry):
    if not isinstance(entry, dict):
        return

    try:
        init_platform_db()
        session = SessionLocal()
        try:
            tokens = entry.get("tokens") if isinstance(entry.get("tokens"), dict) else {}
            record = AIInteraction(
                interaction_type=truncate_with_log(
                    str(entry.get("type") or "chat"),
                    max_length=255,
                    field_name='ai_interactions.interaction_type',
                    logger=LOGGER,
                ),
                provider=truncate_with_log(
                    str(entry.get("provider") or "ai-gateway"),
                    max_length=255,
                    field_name='ai_interactions.provider',
                    logger=LOGGER,
                ),
                model=truncate_with_log(
                    str(entry.get("model") or ""),
                    max_length=255,
                    field_name='ai_interactions.model',
                    logger=LOGGER,
                ),
                prompt=str(entry.get("prompt") or ""),
                response=str(entry.get("response") or ""),
                status=truncate_with_log(
                    str(entry.get("status") or "ok"),
                    max_length=255,
                    field_name='ai_interactions.status',
                    logger=LOGGER,
                ),
                error=str(entry.get("error") or "").strip() or None,
                input_tokens=int(tokens.get("input") or 0),
                output_tokens=int(tokens.get("output") or 0),
                total_tokens=int(tokens.get("total") or 0),
                duration_ms=int(entry.get("durationMs") or 0),
                source_host=truncate_with_log(
                    _encode_source_host(entry),
                    max_length=255,
                    field_name='ai_interactions.source_host',
                    logger=LOGGER,
                ) or None,
            )
            session.add(record)
            session.commit()
        finally:
            session.close()
    except Exception:
        # File log is still written for successful calls; do not fail caller on DB issues.
        return


def _read_ai_interactions_db(limit=200):
    read_limit = max(1, min(int(limit or 200), _MAX_READ_ITEMS))
    try:
        init_platform_db()
        session = SessionLocal()
        try:
            rows = (
                session.query(AIInteraction)
                .order_by(AIInteraction.created_at.desc(), AIInteraction.id.desc())
                .limit(read_limit)
                .all()
            )
            items = []
            for row in rows:
                decoded_source = _decode_source_host(row.source_host or "")
                items.append(
                    {
                        "timestamp": row.created_at.isoformat() if row.created_at else _utc_now_iso(),
                        "type": row.interaction_type,
                        "mode": row.interaction_type,
                        "agentId": decoded_source.get("agentId") or "",
                        "route": decoded_source.get("route") or "",
                        "sourceAgent": decoded_source.get("sourceAgent") or "",
                        "responseType": decoded_source.get("responseType") or "",
                        "originalUserQuery": decoded_source.get("originalUserQuery") or "",
                        "provider": row.provider,
                        "model": row.model,
                        "prompt": row.prompt or "",
                        "response": row.response or "",
                        "tokens": {
                            "input": int(row.input_tokens or 0),
                            "output": int(row.output_tokens or 0),
                            "total": int(row.total_tokens or 0),
                        },
                        "durationMs": int(row.duration_ms or 0),
                        "status": row.status or "ok",
                        "error": row.error or "",
                    }
                )
            return items
        finally:
            session.close()
    except Exception:
        return []


def read_ai_interactions(limit=200, log_path=None):
    read_limit = max(1, min(int(limit or 200), _MAX_READ_ITEMS))
    db_items = _read_ai_interactions_db(read_limit)
    if db_items:
        return db_items

    log_file = Path(log_path) if log_path else _default_log_path()
    if not log_file.exists():
        return []

    items = []
    with _LOCK:
        with log_file.open("r", encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if not line:
                    continue
                try:
                    parsed = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if isinstance(parsed, dict):
                    items.append(parsed)

    return list(reversed(items[-read_limit:]))

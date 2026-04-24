import re
from datetime import datetime, timedelta, timezone


DEVICE_PATTERN = re.compile(r"\bLAH[LD]\s?[A-Z0-9]{4,}\b", re.IGNORECASE)
ROOM_PATTERN = re.compile(r"\b\d{3,5}\b")
FLOOR_PATTERN = re.compile(r"\b(\d{1,2})(?:st|nd|rd|th)?\s+floor\b", re.IGNORECASE)
AREA_PATTERN = re.compile(
    r"\b(ICU|ER|ED|Emergency(?:\s+Room)?|Nurses?\s+Station|Office|Clinic|Lab|Radiology|OR|Surgery|Pharmacy|Lobby)\b",
    re.IGNORECASE,
)
PHONE_PATTERN = re.compile(r"\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b")
TEN_DIGIT_PHONE_PATTERN = re.compile(r"\b\d{10}\b")

OPENED_AT_KEYS = ("opened_at", "opened", "openedAt", "sys_created_on", "created_at")
TICKET_KEYS = ("ticket", "number", "ticket_number", "id", "sys_id")
PRIMARY_TEXT_FIELDS = ("description", "short_description", "u_description")
SECONDARY_TEXT_FIELDS = ("comments_and_work_notes", "work_notes", "comments", "u_notes")
ALL_TEXT_FIELDS = (
    "description",
    "short_description",
    "comments_and_work_notes",
    "work_notes",
    "comments",
    "u_description",
    "u_notes",
)


def _as_text(value) -> str:
    return " ".join(str(value or "").split()).strip()


def _normalize_text(value) -> str:
    return _as_text(value).upper()


def _normalize_device_token(value) -> str:
    return re.sub(r"\s+", "", str(value or "").upper()).strip()


def _normalize_query(value) -> str:
    query = _normalize_text(value)
    if query.startswith("LAH"):
        return _normalize_device_token(query)
    return query


def _join_fields(ticket: dict, field_names: tuple[str, ...]) -> str:
    parts = []
    for field_name in field_names:
        value = _as_text(ticket.get(field_name))
        if value:
            parts.append(value)
    return " ".join(parts).strip()


def _get_ticket_id(ticket: dict) -> str:
    for key in TICKET_KEYS:
        raw = ticket.get(key)
        if raw is None:
            continue
        text = _as_text(raw)
        if text:
            return text
    return ""


def _parse_opened_at(value):
    text = str(value or "").strip()
    if not text:
        return None

    # Normalize common 'Z' suffix for datetime.fromisoformat compatibility.
    if text.endswith("Z"):
        text = f"{text[:-1]}+00:00"

    candidates = [
        text,
        text.replace("T", " "),
        text.split(".", 1)[0],
    ]
    formats = (
        "%Y-%m-%d %H:%M:%S%z",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
        "%m/%d/%Y %H:%M:%S",
        "%m/%d/%Y",
    )

    for candidate in candidates:
        try:
            parsed = datetime.fromisoformat(candidate)
            if parsed.tzinfo is None:
                return parsed.replace(tzinfo=timezone.utc)
            return parsed.astimezone(timezone.utc)
        except ValueError:
            pass

        for fmt in formats:
            try:
                parsed = datetime.strptime(candidate, fmt)
                if parsed.tzinfo is None:
                    return parsed.replace(tzinfo=timezone.utc)
                return parsed.astimezone(timezone.utc)
            except ValueError:
                continue

    return None


def _is_recent_ticket(ticket: dict, now_utc=None) -> bool:
    now = now_utc or datetime.now(timezone.utc)
    cutoff = now - timedelta(days=365)
    for key in OPENED_AT_KEYS:
        parsed = _parse_opened_at(ticket.get(key))
        if parsed is None:
            continue
        return parsed >= cutoff
    return False


def _mask_spans(text: str, spans: list[tuple[int, int]]) -> str:
    if not spans:
        return text
    chars = list(text)
    for start, end in spans:
        safe_start = max(0, int(start))
        safe_end = min(len(chars), int(end))
        for index in range(safe_start, safe_end):
            chars[index] = " "
    return "".join(chars)


def _extract_entities_from_text(text: str) -> dict:
    normalized = _normalize_text(text)

    device_matches = list(DEVICE_PATTERN.finditer(normalized))
    devices = sorted({_normalize_device_token(match.group(0)) for match in device_matches})

    phone_matches = list(PHONE_PATTERN.finditer(normalized)) + list(TEN_DIGIT_PHONE_PATTERN.finditer(normalized))
    masked_text = _mask_spans(normalized, [(m.start(), m.end()) for m in phone_matches + device_matches])

    rooms = sorted({match.group(0) for match in ROOM_PATTERN.finditer(masked_text)})
    floors = sorted({match.group(0).strip() for match in FLOOR_PATTERN.finditer(normalized)})
    areas = sorted({match.group(0).strip() for match in AREA_PATTERN.finditer(normalized)})

    return {
        "devices": devices,
        "rooms": rooms,
        "floors": floors,
        "areas": areas,
    }


def _dedupe_sorted(values: list[str]) -> list[str]:
    return sorted({str(value).strip() for value in values if str(value).strip()})


def _build_ticket_result(ticket: dict) -> dict | None:
    primary_text = _join_fields(ticket, PRIMARY_TEXT_FIELDS)
    secondary_text = _join_fields(ticket, SECONDARY_TEXT_FIELDS)

    primary = _extract_entities_from_text(primary_text)
    secondary = _extract_entities_from_text(secondary_text)

    primary_has_device = bool(primary["devices"])
    primary_has_room = bool(primary["rooms"])
    primary_has_any = primary_has_device or primary_has_room
    secondary_has_any = bool(secondary["devices"] or secondary["rooms"])

    if not primary_has_any and not secondary_has_any:
        return None

    if primary_has_device and primary_has_room:
        confidence = "HIGH"
        source = "primary"
    elif primary_has_any:
        confidence = "MEDIUM"
        source = "primary"
    else:
        confidence = "LOW"
        source = "secondary"

    opened_at_value = ""
    for opened_key in OPENED_AT_KEYS:
        candidate = _as_text(ticket.get(opened_key))
        if candidate:
            opened_at_value = candidate
            break

    return {
        "ticket": _get_ticket_id(ticket),
        "devices": _dedupe_sorted(primary["devices"] + secondary["devices"]),
        "rooms": _dedupe_sorted(primary["rooms"] + secondary["rooms"]),
        "floors": _dedupe_sorted(primary["floors"] + secondary["floors"]),
        "areas": _dedupe_sorted(primary["areas"] + secondary["areas"]),
        "confidence": confidence,
        "source": source,
        "opened_at": opened_at_value,
    }


def analyze_device_locations(data: list[dict], recent_only: bool = False) -> list[dict]:
    rows = data if isinstance(data, list) else []
    results = []
    now_utc = datetime.now(timezone.utc)

    for row in rows:
        if not isinstance(row, dict):
            continue
        if recent_only and not _is_recent_ticket(row, now_utc=now_utc):
            continue
        result = _build_ticket_result(row)
        if result is None:
            continue
        results.append(result)

    return results


def search_device_locations(query: str, data: list[dict], recent_only: bool = False) -> list[dict]:
    normalized_query = _normalize_query(query)
    if not normalized_query:
        return []

    analyzed = analyze_device_locations(data, recent_only=recent_only)

    search_by_device = normalized_query.startswith("LAH")
    filtered = []
    for item in analyzed:
        devices = [_normalize_device_token(value) for value in item.get("devices") or []]
        rooms = [_normalize_text(value) for value in item.get("rooms") or []]
        if search_by_device:
            if any(normalized_query in device for device in devices):
                filtered.append(item)
        elif normalized_query in rooms:
            filtered.append(item)

    return filtered


def find_matching_ticket_rows(query: str, data: list[dict], limit: int | None = None, recent_only: bool = False) -> list[dict]:
    normalized_query = _normalize_query(query)
    if not normalized_query:
        return []

    rows = data if isinstance(data, list) else []
    search_by_device = normalized_query.startswith("LAH")
    matched_rows = []
    now_utc = datetime.now(timezone.utc)
    max_rows = int(limit) if limit is not None else None

    for row in rows:
        if not isinstance(row, dict):
            continue
        if recent_only and not _is_recent_ticket(row, now_utc=now_utc):
            continue

        result = _build_ticket_result(row)
        if result is None:
            continue

        devices = [_normalize_device_token(value) for value in result.get("devices") or []]
        rooms = [_normalize_text(value) for value in result.get("rooms") or []]
        if search_by_device:
            if not any(normalized_query in device for device in devices):
                continue
        elif normalized_query not in rooms:
            continue

        matched_rows.append(row)
        if max_rows is not None and max_rows > 0 and len(matched_rows) >= max_rows:
            break

    return matched_rows


def device_location_debug(data: list[dict], recent_only: bool = False) -> dict:
    rows = data if isinstance(data, list) else []
    processed = 0
    if recent_only:
        now_utc = datetime.now(timezone.utc)
        for row in rows:
            if isinstance(row, dict) and _is_recent_ticket(row, now_utc=now_utc):
                processed += 1
    else:
        processed = sum(1 for row in rows if isinstance(row, dict))

    analyzed = analyze_device_locations(rows, recent_only=recent_only)
    unique_devices = sorted(
        {
            _normalize_device_token(device)
            for item in analyzed
            for device in (item.get("devices") or [])
            if _normalize_device_token(device)
        }
    )
    return {
        "total_processed": processed,
        "devices_found": len(unique_devices),
        "sample_devices": unique_devices[:10],
        "fields_scanned": list(ALL_TEXT_FIELDS),
    }

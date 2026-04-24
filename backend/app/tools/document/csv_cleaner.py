import csv
import io
import json


def clean_csv_file(file_stream):
    """
    Ensures UTF-8 decoding and strips problematic characters.
    """
    if hasattr(file_stream, "seek"):
        file_stream.seek(0)

    raw = file_stream.read()
    if isinstance(raw, str):
        raw = raw.encode("utf-8", errors="replace")

    # Force UTF-8 decode safely
    text = raw.decode("utf-8", errors="replace")

    # Normalize line endings
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    return io.StringIO(text)


def clean_json_file(file_stream):
    """
    Ensures UTF-8 safe JSON decoding and returns parsed JSON payload.
    """
    if hasattr(file_stream, "seek"):
        file_stream.seek(0)

    raw = file_stream.read()
    if isinstance(raw, str):
        text = raw
    else:
        text = bytes(raw or b"").decode("utf-8", errors="replace")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    return json.loads(text)


def _normalize_header_key(header: str) -> str:
    cleaned = str(header or "").lstrip("\ufeff")
    cleaned = " ".join(cleaned.strip().replace("_", " ").split()).lower()
    return cleaned


def normalize_headers(headers):
    """
    Maps incoming CSV headers to internal schema.
    """
    header_map = {
        "vendor/application name": "vendor_name",
        "vendor application name": "vendor_name",
        "vendor name": "vendor_name",
        "vendor": "vendor_name",
        "bus. function": "business_function",
        "bus function": "business_function",
        "business function": "business_function",
        "application name": "application_name",
        "application": "application_name",
        "app name": "application_name",
        "phi": "phi",
        "corp. standard": "corp_standard",
        "corp standard": "corp_standard",
        "baa": "baa",
        "ahs core level": "core_level",
        "core level": "core_level",
        "twlight": "twilight",
        "twilight": "twilight",
        "sys. owner": "system_owner",
        "sys owner": "system_owner",
        "system owner": "system_owner",
        "infrastructure hosted by": "hosting_provider",
        "hosted by": "hosting_provider",
        "hos. where deployed": "deployed_sites",
        "where deployed": "deployed_sites",
        "deployed sites": "deployed_sites",
        "description": "description",
        "owner": "business_owner",
        "business owner": "business_owner",
        "epic group name": "epic_group_name",
    }

    normalized = []
    for header in headers:
        header_key = _normalize_header_key(header)
        mapped = header_map.get(header_key)
        if mapped:
            normalized.append(mapped)
            continue
        normalized.append(header_key.replace(" ", "_"))

    return normalized


def read_clean_csv_rows(file_stream):
    """Read cleaned CSV into header + row list."""
    cleaned_stream = clean_csv_file(file_stream)
    reader = csv.reader(cleaned_stream)
    rows = list(reader)
    if not rows:
        return [], []
    headers = normalize_headers(rows[0])
    return headers, rows[1:]


def read_clean_table_rows(file_stream, file_type: str = "csv"):
    """
    Read cleaned tabular data from CSV or JSON and return (headers, rows).
    JSON accepts:
      - list[object]
      - {"rows": list[object]}
      - {"items": list[object]}
    """
    normalized_type = str(file_type or "csv").strip().lower()

    if normalized_type == "csv":
        return read_clean_csv_rows(file_stream)

    if normalized_type != "json":
        raise ValueError("Unsupported table file type.")

    payload = clean_json_file(file_stream)
    if isinstance(payload, dict):
        rows = payload.get("rows")
        if not isinstance(rows, list):
            rows = payload.get("items")
    elif isinstance(payload, list):
        rows = payload
    else:
        rows = None

    if not isinstance(rows, list) or not rows:
        return [], []

    object_rows = [row for row in rows if isinstance(row, dict)]
    if not object_rows:
        return [], []

    seen = set()
    raw_headers = []
    for row in object_rows:
        for key in row.keys():
            key_text = str(key or "").strip()
            if not key_text or key_text in seen:
                continue
            seen.add(key_text)
            raw_headers.append(key_text)

    headers = normalize_headers(raw_headers)
    cleaned_rows = []
    for row in object_rows:
        cleaned_rows.append([row.get(source_header, "") for source_header in raw_headers])

    return headers, cleaned_rows

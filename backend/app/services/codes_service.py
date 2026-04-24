import csv
import io
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from flask import current_app
try:
    import qrcode
except Exception:  # pragma: no cover - optional runtime dependency
    qrcode = None

try:
    from barcode import Code128
    from barcode.writer import ImageWriter
except Exception:  # pragma: no cover - optional runtime dependency
    Code128 = None
    ImageWriter = None


MAX_TEXT_LENGTH = 1024
MAX_UPLOAD_ITEMS = 100
TEST_QR_LABEL = "AdventHealth Intranet Test QR"
TEST_QR_TEXT = "https://intranet.adventhealth.com"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _backend_data_dir() -> Path:
    configured = str(current_app.config.get("BACKEND_DATA_DIR") or "/app/data").strip() or "/app/data"
    return Path(configured)


def _codes_storage_dir() -> Path:
    return _backend_data_dir() / "codes"


def _codes_images_dir() -> Path:
    return _codes_storage_dir() / "images"


def _codes_index_path() -> Path:
    return _codes_storage_dir() / "codes.json"


def _ensure_storage() -> None:
    _codes_storage_dir().mkdir(parents=True, exist_ok=True)
    _codes_images_dir().mkdir(parents=True, exist_ok=True)


def _load_records() -> list[dict]:
    _ensure_storage()
    index_path = _codes_index_path()
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
    _codes_index_path().write_text(json.dumps(records, indent=2), encoding="utf-8")


def _normalize_text(value: str) -> str:
    return " ".join(str(value or "").replace("\ufeff", "").strip().split())


def _normalize_label(value: str) -> str:
    return str(value or "").strip()


def _validate_code_type(code_type: str) -> str:
    normalized = str(code_type or "").strip().lower()
    if normalized not in {"qr", "barcode"}:
        raise ValueError('type must be "qr" or "barcode".')
    return normalized


def _build_qr_png_bytes(text: str) -> bytes:
    if qrcode is None:
        raise ValueError("QR generation is unavailable until qrcode is installed.")
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(text)
    qr.make(fit=True)
    image = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def _build_barcode_png_bytes(text: str) -> bytes:
    if Code128 is None or ImageWriter is None:
        raise ValueError("Barcode generation is unavailable until python-barcode is installed.")
    buffer = io.BytesIO()
    code = Code128(text, writer=ImageWriter())
    code.write(
        buffer,
        options={
            "module_width": 0.25,
            "module_height": 15,
            "quiet_zone": 2.0,
            "font_size": 10,
            "text_distance": 3.0,
            "write_text": True,
        },
    )
    return buffer.getvalue()


def _build_image_bytes(code_type: str, text: str) -> bytes:
    if code_type == "qr":
        return _build_qr_png_bytes(text)
    return _build_barcode_png_bytes(text)


def _persist_image(image_bytes: bytes, record_id: str, code_type: str) -> str:
    _ensure_storage()
    filename = f"{record_id}_{code_type}.png"
    (_codes_images_dir() / filename).write_bytes(image_bytes)
    return filename


def _public_image_url(record_id: str) -> str:
    return f"/api/work/codes/{record_id}/image"


def _build_record(record_id: str, code_type: str, text: str, label: str, source: str, image_filename: str) -> dict:
    normalized_text = _normalize_text(text)
    return {
        "id": record_id,
        "type": code_type,
        "text": normalized_text,
        "label": _normalize_label(label) or normalized_text[:80],
        "source": source,
        "created_at": _utc_now_iso(),
        "image_filename": image_filename,
        "image_url": _public_image_url(record_id),
    }


def create_code(code_type: str, text: str, label: str = "", source: str = "text") -> dict:
    normalized_type = _validate_code_type(code_type)
    normalized_text = _normalize_text(text)
    if not normalized_text:
        raise ValueError("text is required.")
    if len(normalized_text) > MAX_TEXT_LENGTH:
        raise ValueError(f"text exceeds {MAX_TEXT_LENGTH} characters.")

    image_bytes = _build_image_bytes(normalized_type, normalized_text)
    record_id = str(uuid.uuid4())
    image_filename = _persist_image(image_bytes, record_id, normalized_type)

    records = _load_records()
    record = _build_record(record_id, normalized_type, normalized_text, label, source, image_filename)
    records.insert(0, record)
    _save_records(records)
    return record


def _extract_text_items_from_upload(file_bytes: bytes, filename: str) -> list[str]:
    text = file_bytes.decode("utf-8", errors="replace")
    suffix = Path(str(filename or "").strip().lower()).suffix

    items = []
    if suffix == ".csv":
        reader = csv.reader(io.StringIO(text))
        for row in reader:
            for cell in row:
                cleaned = _normalize_text(cell)
                if cleaned:
                    items.append(cleaned)
    else:
        for line in text.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
            cleaned = _normalize_text(line)
            if cleaned:
                items.append(cleaned)

    deduped = []
    seen = set()
    for item in items:
        key = item.lower()
        if key in seen:
            continue
        deduped.append(item)
        seen.add(key)
    return deduped[:MAX_UPLOAD_ITEMS]


def create_codes_from_upload(file_bytes: bytes, filename: str, code_type: str, source: str = "upload") -> list[dict]:
    text_items = _extract_text_items_from_upload(file_bytes, filename)
    if not text_items:
        raise ValueError("No usable text rows found in uploaded file.")

    created = []
    for value in text_items:
        try:
            created.append(create_code(code_type=code_type, text=value, source=source))
        except ValueError:
            continue
    if not created:
        raise ValueError("No valid codes were generated from uploaded file.")
    return created


def list_codes(query: str = "", code_type: str = "") -> list[dict]:
    _ensure_seed_test_qr()
    records = _load_records()
    normalized_query = _normalize_text(query).lower()
    normalized_type = str(code_type or "").strip().lower()
    if normalized_type and normalized_type not in {"qr", "barcode"}:
        normalized_type = ""

    if not normalized_query and not normalized_type:
        return records

    filtered = []
    for record in records:
        record_type = str(record.get("type") or "").strip().lower()
        if normalized_type and record_type != normalized_type:
            continue
        if normalized_query:
            label = _normalize_text(record.get("label") or "").lower()
            if normalized_query not in label:
                continue
        filtered.append(record)
    return filtered


def get_code_image_path(record_id: str) -> Path | None:
    records = _load_records()
    for record in records:
        if str(record.get("id")) != str(record_id):
            continue
        filename = str(record.get("image_filename") or "").strip()
        if not filename:
            return None
        path = _codes_images_dir() / filename
        return path if path.exists() else None
    return None


def _ensure_seed_test_qr() -> None:
    records = _load_records()
    for record in records:
        if str(record.get("type")) != "qr":
            continue
        if _normalize_text(record.get("text", "")) == TEST_QR_TEXT:
            return
    try:
        create_code(code_type="qr", text=TEST_QR_TEXT, label=TEST_QR_LABEL, source="seed")
    except ValueError:
        return

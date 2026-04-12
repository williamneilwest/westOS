import base64
import json
import os
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request, send_from_directory
from werkzeug.utils import secure_filename

email_upload_bp = Blueprint("email_upload", __name__)

UPLOAD_DIR = "/app/data/uploads"
MAX_ATTACHMENT_BYTES = int(os.getenv('MAX_EMAIL_ATTACHMENT_BYTES', str(10 * 1024 * 1024)))
ALLOWED_ATTACHMENT_EXTENSIONS = {
    extension.strip().lower()
    for extension in os.getenv(
        'ALLOWED_EMAIL_ATTACHMENT_EXTENSIONS',
        '.csv,.txt,.pdf,.png,.jpg,.jpeg,.gif,.webp,.xlsx,.xls,.doc,.docx',
    ).split(',')
    if extension.strip()
}
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _metadata_path(filename):
    return os.path.join(UPLOAD_DIR, f'{filename}.meta.json')


def _write_upload_metadata(filename, source):
    payload = {
        'source': source or 'manual',
    }

    with open(_metadata_path(filename), 'w', encoding='utf-8') as handle:
        json.dump(payload, handle)


def _read_upload_metadata(filename):
    path = _metadata_path(filename)
    if not os.path.exists(path):
        return {}

    try:
        with open(path, 'r', encoding='utf-8') as handle:
            parsed = json.load(handle)
            return parsed if isinstance(parsed, dict) else {}
    except (OSError, json.JSONDecodeError):
        return {}


def is_allowed_attachment(filename):
    if not filename:
        return False

    return os.path.splitext(filename)[1].lower() in ALLOWED_ATTACHMENT_EXTENSIONS


def is_csv_attachment(filename):
    return os.path.splitext(filename or '')[1].lower() == '.csv'


# -----------------------------
# Central helpers (public)
# -----------------------------
def clean_filename(name: str) -> str:
    """Return a cleaned, safe filename component.

    - Strips whitespace
    - Uses werkzeug.secure_filename to normalize
    - Returns empty string on malformed input
    """
    try:
        return secure_filename((name or '').strip())
    except Exception:
        return ''


def extract_original_name(saved_name: str) -> str:
    """Extract the original filename portion from a stored name.

    Supports multiple patterns to be robust to legacy/manual files:
    - "<timestamp>_<name>"  (our standard saved format)
    - "<timestamp> <name>"  (space separator)
    - "<timestamp>-<name>"  (dash separator)

    Where <timestamp> is 8–14 digits (e.g., YYYYMMDD or YYYYMMDDHHMMSS).
    If no recognizable timestamp prefix exists, returns a cleaned fallback.
    """
    if not saved_name:
        return ''

    try:
        base = os.path.basename(saved_name)
    except Exception:
        base = saved_name

    # Fast path: our standard format "YYYYMMDDHHMMSS_<name>"
    try:
        underscore = base.index('_')
        ts_part = base[:underscore]
        if ts_part.isdigit() and 8 <= len(ts_part) <= 14:
            return base[underscore + 1 :]
    except ValueError:
        pass

    # General pattern: leading timestamp followed by space/underscore/dash
    try:
        import re  # local import to avoid global cost on cold paths

        m = re.match(r"^(\d{8,14})[\s_-]+(.+)$", base)
        if m:
            return m.group(2)
    except Exception:
        pass

    # Fallback: return a cleaned version of the input (safe, stable)
    return clean_filename(base)


def _build_file_url(filename: str) -> str:
    """Generate a consistent URL for a stored file (back-compat path)."""
    return f"/uploads/{filename}"


def purge_previous_versions(clean_key: str) -> None:
    """Remove previously saved files whose cleaned original name matches clean_key.

    - clean_key should be lowercased, derived from clean_filename(original_name).
    - Ignores timestamp prefixes.
    - Safe on malformed input (no-ops on empty key).
    - Logs removed duplicates.
    """
    ck = (clean_key or '').strip().lower()
    if not ck:
        return

    try:
        for name in os.listdir(UPLOAD_DIR):
            # Skip metadata files
            if name.endswith('.meta.json'):
                continue

            # Compare using cleaned, case-insensitive original component
            original_component = clean_filename(extract_original_name(name)).lower()
            if original_component != ck:
                continue

            file_path = os.path.join(UPLOAD_DIR, name)
            meta_path = _metadata_path(name)

            try:
                os.remove(file_path)
                print(f"[uploads] Removed older duplicate: {file_path}")
            except OSError:
                pass

            try:
                if os.path.exists(meta_path):
                    os.remove(meta_path)
            except OSError:
                pass
    except OSError:
        # Upload directory might not be readable; ignore purge errors.
        return


def save_uploaded_attachment(file, source='manual'):
    # Determine a stable comparison key for deduplication (cleaned, case-insensitive)
    original_name = (file.filename or '').strip()
    cleaned = clean_filename(original_name)
    clean_key = cleaned.lower()

    # Purge older iterations of the same cleaned filename (keep only the newest)
    purge_previous_versions(clean_key)

    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    safe_name = f"{timestamp}_{cleaned}"
    path = os.path.join(UPLOAD_DIR, safe_name)

    file.save(path)
    _write_upload_metadata(safe_name, source)

    print(f"[uploads] Saved file: {path} (source={source})")

    return {
        "filename": safe_name,
        "path": path,
        "url": _build_file_url(safe_name),
    }


def save_uploaded_attachment_bytes(filename, content, source='manual'):
    # Determine a stable comparison key for deduplication (cleaned, case-insensitive)
    original_name = (filename or '').strip()
    cleaned = clean_filename(original_name)
    clean_key = cleaned.lower()

    # Purge older iterations of the same cleaned filename (keep only the newest)
    purge_previous_versions(clean_key)

    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    safe_name = f"{timestamp}_{cleaned}"
    path = os.path.join(UPLOAD_DIR, safe_name)

    with open(path, 'wb') as handle:
        handle.write(content)
    _write_upload_metadata(safe_name, source)

    print(f"[uploads] Saved file from bytes: {path} (source={source})")

    return {
        "filename": safe_name,
        "path": path,
        "url": _build_file_url(safe_name),
    }


def _get_sendgrid_attachment_names():
    raw = request.form.get('attachment-info', '')
    if not raw:
        return {}

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return {}

    if not isinstance(payload, dict):
        return {}

    attachment_names = {}
    for key, value in payload.items():
        if not isinstance(value, dict):
            continue

        filename = value.get('filename')
        if filename:
            attachment_names[key] = filename

    return attachment_names


def iter_sendgrid_attachments():
    attachment_names = _get_sendgrid_attachment_names()

    for key, value in request.form.items():
        if not key.startswith('attachment'):
            continue

        filename = attachment_names.get(key, f'{key}.csv')

        try:
            content = base64.b64decode(value, validate=True)
        except (ValueError, TypeError):
            continue

        if not is_allowed_attachment(filename):
            continue

        if len(content) > MAX_ATTACHMENT_BYTES:
            continue

        yield {
            'field': key,
            'filename': filename,
            'content': content,
        }


def _extract_saved_original_name(saved_filename):
    """Deprecated: use extract_original_name"""
    return extract_original_name(saved_filename)


@email_upload_bp.route("/webhooks/mailgun", methods=["POST"])
def handle_incoming_email():
    saved_files = []

    for file in request.files.values():
        filename = (file.filename or '').strip()
        if not is_allowed_attachment(filename):
            continue

        file.stream.seek(0, os.SEEK_END)
        size = file.stream.tell()
        file.stream.seek(0)
        if size > MAX_ATTACHMENT_BYTES:
            continue

        saved_record = save_uploaded_attachment(file, source='email')
        saved_files.append({
            "filename": saved_record["filename"],
            "url": saved_record["url"]
        })

    if not saved_files:
        return jsonify({
            "success": False,
            "message": "No valid attachments were found"
        }), 400

    return jsonify({
        "success": True,
        "saved": saved_files
    })


@email_upload_bp.route("/uploads", methods=["GET"])
@email_upload_bp.route("/api/uploads", methods=["GET"])  # parallel API path (back-compat preserved)
def list_uploads():
    # Dedupe at read-time: group by cleaned original filename and keep only the most recent
    files_by_key = {}

    try:
        names = os.listdir(UPLOAD_DIR)
    except OSError:
        names = []

    for name in names:
        # Skip metadata sidecar files
        if name.endswith('.meta.json'):
            continue

        full_path = os.path.join(UPLOAD_DIR, name)

        # Basic file check
        if not os.path.isfile(full_path):
            continue

        try:
            original = extract_original_name(name)
            clean_key = clean_filename(original).lower()
            if not clean_key:
                continue
        except Exception:
            continue

        try:
            modified_ts = os.path.getmtime(full_path)
        except OSError:
            modified_ts = 0

        metadata = _read_upload_metadata(name)
        source = str(metadata.get('source') or 'manual').strip() or 'manual'

        # Keep only the newest file per cleaned key
        prev = files_by_key.get(clean_key)
        if (prev is None) or (modified_ts > prev["modified"]):
            files_by_key[clean_key] = {
                "name": name,
                "original": original,
                "modified": modified_ts,
                "source": source,
            }

    # Build response list
    files = []
    for item in files_by_key.values():
        files.append({
            "filename": item["name"],
            "originalName": item["original"],
            "url": _build_file_url(item["name"]),
            "modifiedAt": datetime.fromtimestamp(item["modified"], tz=timezone.utc).isoformat() if item["modified"] else None,
            "source": item["source"],
        })

    # Newest first
    files.sort(key=lambda x: (x["modifiedAt"] or ""), reverse=True)

    return jsonify(files)


@email_upload_bp.route("/uploads/<path:filename>", methods=["GET"])
@email_upload_bp.route("/api/uploads/<path:filename>", methods=["GET"])  # parallel API path
def get_upload(filename):
    return send_from_directory(UPLOAD_DIR, filename)

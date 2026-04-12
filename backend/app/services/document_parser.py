import io
import json
import logging
import mimetypes
from pathlib import Path

from flask import current_app

try:
    import fitz
except ImportError:  # pragma: no cover - dependency optional at runtime
    fitz = None

try:
    import pytesseract
except ImportError:  # pragma: no cover - dependency optional at runtime
    pytesseract = None

try:
    from PIL import Image
except ImportError:  # pragma: no cover - dependency optional at runtime
    Image = None


LOGGER = logging.getLogger(__name__)
MIN_EXTRACTED_TEXT_CHARS = 500
PROMPT_TEMPLATE = """Convert the following IT document into structured JSON with fields:

* title
* category
* keywords (array)
* steps (array)
* rules (array)
* systems (array)
* summary (short paragraph)

Return ONLY valid JSON.

Document text:
{text}
"""


def _storage_root():
    return Path(current_app.config.get('BACKEND_DATA_DIR', '/app/data'))


def _processed_dir():
    path = _storage_root() / 'kb' / 'processed'
    path.mkdir(parents=True, exist_ok=True)
    return path


def _ensure_parser_dependencies():
    missing = []
    if fitz is None:
        missing.append('PyMuPDF')
    if pytesseract is None:
        missing.append('pytesseract')
    if Image is None:
        missing.append('Pillow')

    if missing:
        raise RuntimeError(f'Missing document parsing dependencies: {", ".join(missing)}')


def _processed_output_path(file_path):
    source = Path(file_path)
    return _processed_dir() / f'{source.stem}.json'


def _extract_pdf_text(file_path):
    text_parts = []

    with fitz.open(file_path) as document:
        for page in document:
            page_text = page.get_text('text') or ''
            if page_text.strip():
                text_parts.append(page_text.strip())

        combined = '\n\n'.join(text_parts).strip()
        if len(combined) >= MIN_EXTRACTED_TEXT_CHARS:
            return combined

        ocr_parts = []
        for page in document:
            pixmap = page.get_pixmap()
            image = Image.open(io.BytesIO(pixmap.tobytes('png')))
            ocr_text = pytesseract.image_to_string(image) or ''
            if ocr_text.strip():
                ocr_parts.append(ocr_text.strip())

        fallback = '\n\n'.join(ocr_parts).strip()
        return fallback or combined


def _extract_image_text(file_path):
    with Image.open(file_path) as image:
        return (pytesseract.image_to_string(image) or '').strip()


def extract_document_text(file_path):
    path = Path(file_path)
    mime_type, _ = mimetypes.guess_type(path.name)
    suffix = path.suffix.lower()

    if suffix == '.pdf' or mime_type == 'application/pdf':
        return _extract_pdf_text(path)

    if (mime_type or '').startswith('image/') or suffix in {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tiff'}:
        return _extract_image_text(path)

    try:
        return path.read_text(encoding='utf-8', errors='replace').strip()
    except OSError:
        return ''


def parse_document_with_ai(text):
    prompt = PROMPT_TEMPLATE.format(text=(text or '')[:12000])

    with current_app.test_client() as client:
        response = client.post('/api/ai/chat', json={'message': prompt})

    if response.status_code >= 400:
        raise ValueError(f'AI parsing failed with status {response.status_code}')

    payload = response.get_json(silent=True) or {}
    message = payload.get('message', '')
    if not isinstance(message, str) or not message.strip():
        raise ValueError('AI parsing returned an empty response.')

    return message.strip()


def _normalize_parsed_payload(file_path, text, ai_response):
    try:
        parsed = json.loads(ai_response)
    except json.JSONDecodeError:
        return {
            'filename': Path(file_path).name,
            'parseError': 'AI returned invalid JSON.',
            'rawResponse': ai_response,
            'extractedTextLength': len(text or ''),
        }

    if not isinstance(parsed, dict):
        return {
            'filename': Path(file_path).name,
            'parseError': 'AI returned non-object JSON.',
            'rawResponse': ai_response,
            'extractedTextLength': len(text or ''),
        }

    parsed['filename'] = Path(file_path).name
    parsed['extractedTextLength'] = len(text or '')
    return parsed


def process_document(file_path):
    _ensure_parser_dependencies()
    path = Path(file_path)
    output_path = _processed_output_path(path)

    if output_path.exists():
        return output_path

    text = extract_document_text(path)
    if not text.strip():
        raise ValueError('No document text could be extracted.')

    ai_response = parse_document_with_ai(text)
    payload = _normalize_parsed_payload(path, text, ai_response)
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
    return output_path


def run_document_processing_task(app, file_path):
    with app.app_context():
        output_path = _processed_output_path(file_path)
        if output_path.exists():
            return

        try:
            process_document(file_path)
            LOGGER.info('Processed KB document saved to %s', output_path)
        except Exception as error:
            LOGGER.exception('Failed to process KB document %s: %s', file_path, error)

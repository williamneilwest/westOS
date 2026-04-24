from __future__ import annotations

import csv
import json
import logging
import os
import re
from datetime import datetime, timezone
from pathlib import Path

from flask import current_app

from ..models.platform import DocumentRecord, SessionLocal, init_platform_db
from ..utils.db_strings import truncate_with_log
from .ai_client import build_compat_chat_response, call_gateway_chat
from .document_parser import parse_document

try:
    from docx import Document as DocxDocument
except ImportError:  # pragma: no cover
    DocxDocument = None


DOCUMENT_PROCESSOR_PROMPT = """You are an expert document classifier and metadata generator.

RULES:
- Return ONLY valid JSON
- Max 6 tags
- Tags must be specific and kebab-case
- Avoid generic tags like "data", "system", "access"

OUTPUT:

{
  "title": "...",
  "summary": "...",
  "tags": ["tag-one", "tag-two"],
  "document_type": "technical | operational | reference",
  "confidence": 0.0-1.0
}"""

ALLOWED_TYPES = {'csv', 'json', 'txt', 'pdf', 'docx'}
GENERIC_TAGS = {'data', 'system', 'access'}
ALLOWED_DOCUMENT_TYPES = {'technical', 'operational', 'reference'}
MAX_TEXT_CHARS = 40000
MAX_JSON_CHARS = 30000
MAX_FILE_BYTES = 15 * 1024 * 1024
LOGGER = logging.getLogger(__name__)


def _utc_now():
    return datetime.now(timezone.utc)


def detect_file_type(file_path):
    suffix = Path(str(file_path or '')).suffix.lower()
    if suffix == '.csv':
        return 'csv'
    if suffix == '.json':
        return 'json'
    if suffix in {'.txt', '.text', '.md', '.log'}:
        return 'txt'
    if suffix == '.pdf':
        return 'pdf'
    if suffix == '.docx':
        return 'docx'
    return 'txt'


def _extract_csv_text(file_path):
    with open(file_path, 'r', encoding='utf-8', errors='replace', newline='') as handle:
        reader = csv.reader(handle)
        rows = []
        for index, row in enumerate(reader):
            rows.append(row)
            if index >= 25:
                break

    if not rows:
        return 'CSV document with no rows.'

    headers = rows[0]
    sample_rows = rows[1:]
    formatted_rows = '\n'.join(
        f'row_{idx + 1}: {json.dumps(dict(zip(headers, row)), ensure_ascii=False)}'
        for idx, row in enumerate(sample_rows[:20])
    )
    return '\n'.join(
        [
            'CSV document',
            f'columns: {", ".join(str(header or "").strip() for header in headers if str(header or "").strip())}',
            f'sampled_rows: {len(sample_rows)}',
            formatted_rows or 'No data rows in sample.',
        ]
    ).strip()


def _extract_json_text(file_path):
    with open(file_path, 'r', encoding='utf-8', errors='replace') as handle:
        parsed = json.load(handle)

    serialized = json.dumps(parsed, ensure_ascii=False)
    if len(serialized) > MAX_JSON_CHARS:
        serialized = f'{serialized[:MAX_JSON_CHARS]}\n...'
    return f'JSON document:\n{serialized}'


def _extract_docx_text(file_path):
    if DocxDocument is None:
        parsed = parse_document(file_path)
        return str((parsed or {}).get('text') or '')

    doc = DocxDocument(file_path)
    paragraphs = [str(paragraph.text or '').strip() for paragraph in doc.paragraphs]
    return '\n'.join(line for line in paragraphs if line).strip()


def extract_text(file_path, file_type):
    if file_type == 'csv':
        return _extract_csv_text(file_path)
    if file_type == 'json':
        return _extract_json_text(file_path)
    if file_type == 'docx':
        return _extract_docx_text(file_path)

    parsed = parse_document(file_path)
    return str((parsed or {}).get('text') or '')


def _extract_json(raw_text):
    text = str(raw_text or '').strip()
    if not text:
        return None

    try:
        return json.loads(text)
    except Exception:
        pass

    cleaned = re.sub(r'```json|```', '', text, flags=re.IGNORECASE).strip()
    try:
        return json.loads(cleaned)
    except Exception:
        pass

    match = re.search(r'\{.*\}', cleaned, flags=re.DOTALL)
    if not match:
        return None

    try:
        return json.loads(match.group(0))
    except Exception:
        return None


def _normalize_tag(value):
    normalized = re.sub(r'[^a-zA-Z0-9]+', '-', str(value or '').strip().lower()).strip('-')
    return normalized


def _normalize_metadata(payload):
    title = str(payload.get('title') or '').strip()
    summary = str(payload.get('summary') or '').strip()
    document_type = str(payload.get('document_type') or '').strip().lower()
    if document_type not in ALLOWED_DOCUMENT_TYPES:
        document_type = 'reference'

    confidence = payload.get('confidence', 0)
    try:
        confidence = float(confidence)
    except (TypeError, ValueError):
        confidence = 0.0
    confidence = max(0.0, min(1.0, confidence))

    tags = []
    seen = set()
    for raw_tag in payload.get('tags') or []:
        normalized_tag = _normalize_tag(raw_tag)
        if not normalized_tag or normalized_tag in GENERIC_TAGS or normalized_tag in seen:
            continue
        seen.add(normalized_tag)
        tags.append(normalized_tag)
        if len(tags) >= 6:
            break

    return {
        'title': title,
        'summary': summary,
        'tags': tags,
        'document_type': document_type,
        'confidence': confidence,
    }


def generate_ai_metadata(text):
    request_payload = {
        'messages': [
            {'role': 'system', 'content': DOCUMENT_PROCESSOR_PROMPT},
            {'role': 'user', 'content': f'Document text:\n{text}'},
        ],
        'analysis_mode': 'document_processing',
        'preserve_prompt': True,
    }
    gateway_result = call_gateway_chat(
        request_payload,
        current_app.config['AI_GATEWAY_BASE_URL'],
        timeout_seconds=(5, 45),
    )
    compat = build_compat_chat_response(request_payload, gateway_result)
    parsed = _extract_json(compat.get('message') or '')
    if not isinstance(parsed, dict):
        raise ValueError('AI response did not return valid JSON metadata.')
    return _normalize_metadata(parsed)


def _serialize_record(record: DocumentRecord):
    return {
        'id': int(record.id),
        'file_id': int(record.file_id),
        'filename': record.filename,
        'file_path': record.file_path,
        'file_type': record.file_type,
        'summary': record.summary or '',
        'tags': record.tags if isinstance(record.tags, list) else [],
        'document_type': record.document_type or 'reference',
        'confidence': float(record.confidence or 0),
        'ai_processed': bool(record.ai_processed),
        'processing_status': record.processing_status or 'pending',
        'created_at': record.created_at.isoformat() if record.created_at else None,
        'updated_at': record.updated_at.isoformat() if record.updated_at else None,
    }


def _upsert_document_record(session, *, file_id, file_path, filename, file_type):
    record = session.query(DocumentRecord).filter(DocumentRecord.file_id == int(file_id)).one_or_none()
    if record is None:
        record = session.query(DocumentRecord).filter(DocumentRecord.file_path == str(file_path)).one_or_none()

    now = _utc_now()
    if record is None:
        record = DocumentRecord(
            file_id=int(file_id),
            filename=truncate_with_log(
                str(filename or Path(file_path).name),
                max_length=255,
                field_name='documents.filename',
                logger=LOGGER,
            ),
            file_path=truncate_with_log(
                str(file_path),
                max_length=1024,
                field_name='documents.file_path',
                logger=LOGGER,
            ),
            file_type=truncate_with_log(
                str(file_type or 'unknown'),
                max_length=255,
                field_name='documents.file_type',
                logger=LOGGER,
            ),
            summary='',
            tags=[],
            document_type=truncate_with_log('reference', max_length=255, field_name='documents.document_type', logger=LOGGER),
            confidence=0.0,
            ai_processed=False,
            processing_status=truncate_with_log('pending', max_length=255, field_name='documents.processing_status', logger=LOGGER),
            created_at=now,
            updated_at=now,
        )
        session.add(record)
        return record

    record.file_id = int(file_id)
    record.filename = truncate_with_log(
        str(filename or record.filename),
        max_length=255,
        field_name='documents.filename',
        logger=LOGGER,
    )
    record.file_path = truncate_with_log(
        str(file_path),
        max_length=1024,
        field_name='documents.file_path',
        logger=LOGGER,
    )
    record.file_type = truncate_with_log(
        str(file_type or record.file_type or 'unknown'),
        max_length=255,
        field_name='documents.file_type',
        logger=LOGGER,
    )
    record.processing_status = truncate_with_log(
        'pending',
        max_length=255,
        field_name='documents.processing_status',
        logger=LOGGER,
    )
    record.ai_processed = False
    record.updated_at = now
    return record


def process_document(file_path, file_id):
    init_platform_db()
    file_path = os.path.abspath(str(file_path or '').strip())
    if not file_path or not os.path.isfile(file_path):
        return {'success': False, 'error': 'Document file not found.'}

    max_file_bytes = int(current_app.config.get('DOCUMENT_PROCESSOR_MAX_FILE_BYTES') or MAX_FILE_BYTES)
    file_size = os.path.getsize(file_path)
    if file_size > max_file_bytes:
        return {'success': False, 'error': f'File exceeds processing size limit ({max_file_bytes} bytes).'}

    file_type = detect_file_type(file_path)
    session = SessionLocal()
    record = None
    try:
        record = _upsert_document_record(
            session,
            file_id=int(file_id),
            file_path=file_path,
            filename=os.path.basename(file_path),
            file_type=file_type,
        )
        session.commit()
        session.refresh(record)

        extracted = extract_text(file_path, file_type)
        truncated = str(extracted or '').strip()[:MAX_TEXT_CHARS]
        if not truncated:
            raise ValueError('No text content available for document processing.')

        metadata = generate_ai_metadata(truncated)
        record.summary = metadata['summary']
        record.tags = metadata['tags']
        record.document_type = truncate_with_log(
            metadata['document_type'],
            max_length=255,
            field_name='documents.document_type',
            logger=LOGGER,
        )
        record.confidence = metadata['confidence']
        record.ai_processed = True
        record.processing_status = truncate_with_log(
            'complete',
            max_length=255,
            field_name='documents.processing_status',
            logger=LOGGER,
        )
        record.updated_at = _utc_now()
        session.commit()
        session.refresh(record)
        return {'success': True, 'document': _serialize_record(record)}
    except Exception as error:
        if record is not None:
            try:
                record.processing_status = truncate_with_log(
                    'failed',
                    max_length=255,
                    field_name='documents.processing_status',
                    logger=LOGGER,
                )
                record.ai_processed = False
                record.updated_at = _utc_now()
                session.commit()
            except Exception:
                session.rollback()
        return {'success': False, 'error': str(error)}
    finally:
        session.close()

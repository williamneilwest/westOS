import os
from typing import Callable

from flask import Blueprint, jsonify, request

from .email_upload import save_uploaded_attachment
from ..services.document_ai import analyze_and_store_document
from ..services.document_parser import parse_document
from ..services.file_service import delete_file_by_id, list_all_files, resolve_file_by_id, should_allow_kb_reprocess
from ..services.file_registry import get_file_metadata_by_path
from ..tools.document.csv_tools import get_tools as get_csv_tools
from ..tools.document.json_tools import get_tools as get_json_tools
from ..tools.document.pdf_tools import get_tools as get_pdf_tools
from ..tools.document.text_tools import get_tools as get_text_tools


data_tools_bp = Blueprint('data_tools', __name__)

TOOL_MODULES: dict[str, Callable[[], list[dict]]] = {
    'csv': get_csv_tools,
    'json': get_json_tools,
    'txt': get_text_tools,
    'pdf': get_pdf_tools,
    'docx': get_text_tools,
}

TEXT_EXTENSIONS = {'.txt', '.text', '.md', '.log'}


def _normalize_file_type(filename: str, mime_type: str) -> str:
    extension = os.path.splitext(str(filename or '').lower())[1]
    normalized_mime = str(mime_type or '').lower()

    if extension == '.csv' or normalized_mime in {'text/csv', 'application/vnd.ms-excel'}:
        return 'csv'
    if extension == '.json' or normalized_mime == 'application/json':
        return 'json'
    if extension in TEXT_EXTENSIONS or normalized_mime.startswith('text/'):
        return 'txt'
    if extension == '.pdf' or normalized_mime == 'application/pdf':
        return 'pdf'
    if extension == '.docx' or normalized_mime in {
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
    }:
        return 'docx'

    return 'unknown'


def _get_tools(file_type: str) -> list[dict]:
    loader = TOOL_MODULES.get(file_type)
    return loader() if loader else []


@data_tools_bp.post('/api/data/upload')
def upload_data_file():
    uploaded_file = request.files.get('file')
    if uploaded_file is None or not uploaded_file.filename:
        return jsonify({'error': 'A file is required.'}), 400

    content = uploaded_file.stream.read()
    uploaded_file.stream.seek(0)
    if not content:
        return jsonify({'error': 'Uploaded file is empty.'}), 400

    file_type = _normalize_file_type(uploaded_file.filename, uploaded_file.mimetype)
    suggested_tools = _get_tools(file_type)

    if file_type == 'unknown':
        return jsonify(
            {
                'fileType': 'unknown',
                'fileName': uploaded_file.filename,
                'suggestedTools': [],
                'error': 'Unsupported file type. Supported types: csv, json, txt, pdf, docx.',
            }
        ), 400

    saved_record = save_uploaded_attachment(uploaded_file, source='manual')
    file_row = get_file_metadata_by_path(saved_record.get('path'))
    document_payload = {
        'summary': '',
        'tags': [],
        'document_type': 'reference',
        'confidence': 0.0,
        'ai_processed': False,
        'processing_status': 'stored',
    }

    return jsonify(
        {
            'fileType': file_type,
            'fileName': uploaded_file.filename,
            'suggestedTools': suggested_tools,
            'fileId': int(file_row.id) if file_row is not None else None,
            'fileUrl': saved_record.get('url'),
            'document': document_payload,
            'processingError': '',
        }
    )


@data_tools_bp.get('/api/data/tools/<file_type>')
def get_data_tools(file_type: str):
    normalized = str(file_type or '').strip().lower()
    tools = _get_tools(normalized)
    if not tools:
        return jsonify({'error': f'Unsupported file type: {normalized}'}), 404

    return jsonify({'fileType': normalized, 'tools': tools})


@data_tools_bp.get('/api/files')
def get_all_files():
    return jsonify({'files': list_all_files()})


@data_tools_bp.post('/api/files/reprocess')
def reprocess_file():
    payload = request.get_json(silent=True) or {}
    file_id = str(payload.get('fileId') or payload.get('file_id') or '').strip()
    if not file_id:
        return jsonify({'error': 'fileId is required.'}), 400

    resolved = resolve_file_by_id(file_id)
    if not resolved:
        return jsonify({'error': 'File not found.'}), 404

    if not should_allow_kb_reprocess(file_id):
        return jsonify({'error': 'Unsupported file type for KB reprocess.'}), 400

    parsed = parse_document(resolved['path']) or {}
    text = str((parsed or {}).get('text') or '').strip()
    if not text:
        return jsonify({'error': 'No text could be extracted from this file.'}), 400

    result = analyze_and_store_document(text, resolved['name'])
    return jsonify({'success': True, 'data': result})


@data_tools_bp.delete('/api/data/files/<path:file_id>')
def delete_data_file(file_id):
    if not delete_file_by_id(file_id):
        return jsonify({'error': 'File not found.'}), 404
    return jsonify({'success': True})

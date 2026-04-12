import json
import logging
from pathlib import Path

from flask import current_app


LOGGER = logging.getLogger(__name__)
PROMPT_TEMPLATE = """Convert the following document into STRICT JSON with this exact shape:

{{
  "summary": "...short summary...",
  "type": "ticket | kb | instruction | report | unknown",
  "tags": ["vpn", "access", "responder"],
  "entities": {{
    "systems": [],
    "users": [],
    "groups": [],
    "keywords": []
  }},
  "actionable_insights": [
    "...what should be done...",
    "...possible resolution..."
  ]
}}

Rules:
- NO markdown
- NO explanation
- JSON ONLY
- tags must be lowercase reusable keywords

Filename: {filename}

Document text:
{text}
"""


def _normalize_string_list(value, lowercase=False):
    if not isinstance(value, list):
        return []

    items = []
    seen = set()
    for item in value:
        normalized = str(item or '').strip()
        if lowercase:
            normalized = normalized.lower()
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        items.append(normalized)
    return items


def _normalize_payload(parsed):
    if not isinstance(parsed, dict):
        return {}

    entities = parsed.get('entities')
    if not isinstance(entities, dict):
        entities = {}

    return {
        'summary': str(parsed.get('summary') or '').strip(),
        'type': str(parsed.get('type') or 'unknown').strip().lower() or 'unknown',
        'tags': _normalize_string_list(parsed.get('tags'), lowercase=True),
        'entities': {
            'systems': _normalize_string_list(entities.get('systems')),
            'users': _normalize_string_list(entities.get('users')),
            'groups': _normalize_string_list(entities.get('groups')),
            'keywords': _normalize_string_list(entities.get('keywords'), lowercase=True),
        },
        'actionable_insights': _normalize_string_list(parsed.get('actionable_insights')),
    }


def analyze_document(text, filename):
    prompt = PROMPT_TEMPLATE.format(
        filename=Path(filename or '').name,
        text=(text or '')[:12000],
    )

    with current_app.test_client() as client:
        response = client.post('/api/ai/chat', json={'message': prompt})

    if response.status_code >= 400:
        raise ValueError(f'AI analysis failed with status {response.status_code}')

    payload = response.get_json(silent=True) or {}
    raw_message = str(payload.get('message') or '').strip()
    if not raw_message:
        raise ValueError('AI analysis returned an empty response.')

    try:
        parsed = json.loads(raw_message)
    except json.JSONDecodeError:
        LOGGER.warning('AI analysis returned invalid JSON for %s', filename)
        return {
            'summary': '',
            'type': 'unknown',
            'tags': [],
            'entities': {
                'systems': [],
                'users': [],
                'groups': [],
                'keywords': [],
            },
            'actionable_insights': [],
            'raw_response': raw_message,
        }

    normalized = _normalize_payload(parsed)
    normalized['raw_response'] = raw_message
    return normalized

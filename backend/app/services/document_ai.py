import json
import logging
import os
import re
from pathlib import Path

from flask import current_app

from .ai_client import build_compat_chat_response, call_gateway_chat
from .settings_store import get_ai_model


LOGGER = logging.getLogger(__name__)
PROMPT_TEMPLATE = """You are analyzing an operational support/IT document.

Return a comprehensive plain-text analysis with these sections in order:

Quick Summary:
- 5-8 bullets with concrete facts from the document.

Full Analysis:
1) Purpose and scope
- Explain what this document is for and who should use it.

2) Critical details extracted
- Include systems, users, groups, permissions, dependencies, constraints, deadlines, and environments.
- Include exact identifiers when present (ticket IDs, hostnames, URLs, group names, commands, file paths).

3) Procedure breakdown
- Reconstruct the step-by-step process from the document.
- Flag missing prerequisites or ambiguous steps.

4) Risks and failure points
- List likely errors, hidden assumptions, and operational risks.
- Include severity (high/medium/low) per risk.

5) Validation checklist
- Provide explicit checks to confirm successful execution.

6) Recommended follow-ups
- Provide concrete next actions and suggested improvements.

Requirements:
- Be specific and evidence-based from the provided content.
- Prefer complete coverage over brevity.
- Do not output JSON.
- Do not use markdown code fences.

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


def _strip_trailing_commas(text):
    return re.sub(r',\s*([}\]])', r'\1', text)


def extract_json(text):
    candidate = str(text or '').strip()
    if not candidate:
        return None

    try:
        return json.loads(candidate)
    except Exception:
        pass

    cleaned = re.sub(r'```json|```', '', candidate, flags=re.IGNORECASE).strip()
    cleaned = _strip_trailing_commas(cleaned)
    try:
        return json.loads(cleaned)
    except Exception:
        pass

    match = re.search(r'\{.*\}', cleaned, re.DOTALL)
    if match:
        snippet = _strip_trailing_commas(match.group(0).strip())
        try:
            return json.loads(snippet)
        except Exception:
            pass

    return None


def _calculate_max_tokens(document_text):
    base = 2500
    per_char = int(len(document_text) / 3)
    calculated = base + per_char
    hard_cap = int(os.getenv('OPENAI_HARD_TOKEN_CAP', '20000'))
    soft_cap = int(os.getenv('OPENAI_MAX_OUTPUT_TOKENS', '16000'))
    return max(2000, min(calculated, soft_cap, hard_cap))


def analyze_document(text, filename):
    text = str(text or '').strip()
    input_char_limit = int(os.getenv('DOCUMENT_AI_INPUT_CHAR_LIMIT', '60000'))
    truncated_text = text[:input_char_limit]

    prompt = PROMPT_TEMPLATE.format(
        filename=Path(filename or '').name,
        text=truncated_text,
    )

    document_model = get_ai_model(mode='document_processing')
    max_tokens = _calculate_max_tokens(truncated_text)

    request_payload = {
        'message': prompt,
        'analysis_mode': 'document_processing',
        'model': document_model,
        'max_tokens': max_tokens,
        'preserve_prompt': True,
    }
    gateway_result = call_gateway_chat(
        request_payload,
        current_app.config['AI_GATEWAY_BASE_URL'],
        timeout_seconds=60,
    )
    payload = build_compat_chat_response(request_payload, gateway_result)
    raw_message = str(payload.get('message') or '').strip()
    if not raw_message:
        raise ValueError('AI analysis returned an empty response.')
    usage = gateway_result.get('usage', {}) if isinstance(gateway_result, dict) else {}
    usage = usage if isinstance(usage, dict) else {}
    input_tokens = int(usage.get('prompt_tokens') or usage.get('input_tokens') or 0)
    output_tokens = int(usage.get('completion_tokens') or usage.get('output_tokens') or 0)

    preview = re.sub(r'\s+', ' ', raw_message)[:500]
    LOGGER.info('AI raw response preview for %s: %s', filename, preview)
    first_non_empty_line = next((line.strip() for line in raw_message.splitlines() if line.strip()), '')
    summary = first_non_empty_line[:240] if first_non_empty_line else 'AI analysis completed.'

    return {
        'summary': summary,
        'type': 'raw',
        'tags': [],
        'entities': {
            'systems': [],
            'users': [],
            'groups': [],
            'keywords': [],
        },
        'actionable_insights': [],
        'raw_response': raw_message,
        'input_tokens': input_tokens,
        'output_tokens': output_tokens,
    }

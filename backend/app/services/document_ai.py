import json
import logging
import os
import re
from pathlib import Path

from flask import current_app

from .ai_client import build_compat_chat_response, call_gateway_chat
from .settings_store import get_ai_model


LOGGER = logging.getLogger(__name__)
PROMPT_TEMPLATE = """You are a document intelligence engine.

Your job is to analyze a knowledge base document and return STRICT, VALID JSON only. Do NOT return explanations, markdown, or text outside the JSON.

---

## OUTPUT REQUIREMENTS

Return a single JSON object with the following structure:

{{
"title": string,
"category": string,
"summary": string[],
"purpose": string,
"systems": string[],
"users": string[],
"access": {{
"ad_group": string | null,
"approval_required": boolean,
"approval_type": string | null,
"estimated_time": string | null
}},
"steps": string[],
"risks": [
{{
"issue": string,
"severity": "low" | "medium" | "high",
"mitigation": string
}}
],
"validation": string[],
"missing_info": string[],
"tags": string[],
"search_keywords": string[],
"automation": {{
"can_auto_request": boolean,
"can_track_ticket": boolean,
"requires_human_approval": boolean
}}
}}

---

## STRICT RULES

1. NEVER return large paragraph blobs.

   * Break everything into arrays or short strings.

2. summary:

   * 4–8 concise bullet-style strings
   * Max 12 words each

3. steps:

   * Ordered, actionable, one step per string

4. systems:

   * Extract real system names (e.g., ServiceNow, Active Directory)

5. users:

   * Who this applies to (e.g., employees, admins)

6. access:

   * Extract AD group if present
   * If not present → null
   * approval_required must be true if any approval is mentioned

7. risks:

   * Convert vague risks into actionable issues + mitigation
   * Always include at least 2 if possible

8. missing_info:

   * ONLY include if explicitly unclear or missing in document
   * Do NOT guess

9. tags:

   * Lowercase
   * 1–2 word max each
   * Examples: "chatgpt", "access", "servicenow", "ad-group"

10. search_keywords:

* 3–6 phrases someone would search
* Natural language (not tags)

11. automation:

* can_auto_request = true if request process exists
* can_track_ticket = true if ticketing system is used
* requires_human_approval = true if approval required

12. If a value is unknown:

* Use null (NOT empty string, NOT guess)

13. Output must be VALID JSON (no trailing commas)

---

## GOAL

Convert unstructured documentation into structured, queryable, automation-ready data for a knowledge system and AI agent.

---

## INPUT DOCUMENT

Filename: {filename}

{{document_text}}
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
        document_text=truncated_text,
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

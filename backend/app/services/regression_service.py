import json
import re
from pathlib import Path

from .ai_client import send_chat
from .system_snapshot import generate_system_snapshot


def _repo_readme_path():
    return Path(__file__).resolve().parents[3] / 'README.md'


def _read_readme():
    path = _repo_readme_path()
    try:
        return path.read_text(encoding='utf-8')
    except OSError:
        return ''


def _extract_json(text):
    raw = str(text or '').strip()
    if not raw:
        return None

    try:
        return json.loads(raw)
    except Exception:
        pass

    cleaned = re.sub(r'```json|```', '', raw, flags=re.IGNORECASE).strip()
    try:
        return json.loads(cleaned)
    except Exception:
        pass

    match = re.search(r'\{[\s\S]*\}', cleaned)
    if not match:
        return None

    try:
        return json.loads(match.group(0))
    except Exception:
        return None


def _normalize_result(parsed, fallback=''):
    payload = parsed if isinstance(parsed, dict) else {}
    status = str(payload.get('status') or '').strip().lower()
    if status not in {'pass', 'warn', 'fail'}:
        status = 'warn' if payload else 'fail'

    return {
        'status': status,
        'summary': str(payload.get('summary') or fallback or '').strip(),
        'matches': payload.get('matches') if isinstance(payload.get('matches'), list) else [],
        'warnings': payload.get('warnings') if isinstance(payload.get('warnings'), list) else [],
        'failures': payload.get('failures') if isinstance(payload.get('failures'), list) else [],
        'recommended_fixes': payload.get('recommended_fixes') if isinstance(payload.get('recommended_fixes'), list) else [],
    }


def run_regression_check():
    readme_content = _read_readme()
    snapshot = generate_system_snapshot()
    fallback_summary = 'Regression check completed with partial output.'

    response = send_chat(
        {
            'message': 'Validate the system against the README contract and report regressions.',
            'agent_id': 'regression_agent',
            'analysis_mode': 'focused',
            'context': {
                'readme_content': readme_content,
                'system_snapshot': snapshot,
            },
            'preserve_prompt': True,
        },
        timeout_seconds=(5, 90),
    )

    message = str(response.get('message') or '').strip()
    parsed = _extract_json(message)
    result = _normalize_result(parsed, fallback=fallback_summary)
    if not result['summary']:
        result['summary'] = message[:500] if message else fallback_summary
    return result

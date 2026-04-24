from __future__ import annotations

import os
from datetime import datetime, timezone

import requests
from sqlalchemy import desc

from ..models.platform import FlowTemplate, SessionLocal, init_platform_db
from .flow_router import route_flow_result
from .flow_runs import track_flow_run
from .group_lookup import DEFAULT_TIMEOUT_SECONDS


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _default_endpoint() -> str:
    return str(os.getenv('POWER_AUTOMATE_GROUP_SEARCH_URL', '')).strip()


def _normalize_field(field: dict | None) -> dict:
    payload = field if isinstance(field, dict) else {}
    name = str(payload.get('name') or '').strip()
    field_type = str(payload.get('type') or 'string').strip().lower()
    if field_type not in {'string', 'number', 'boolean'}:
        field_type = 'string'
    required = bool(payload.get('required'))
    return {
        'name': name,
        'type': field_type,
        'required': required,
    }


def normalize_input_schema(input_schema) -> list[dict]:
    if isinstance(input_schema, dict):
        fields = input_schema.get('fields')
    else:
        fields = input_schema

    if not isinstance(fields, list):
        return []

    normalized = []
    seen = set()
    for raw_field in fields:
        field = _normalize_field(raw_field)
        if not field['name']:
            continue
        key = field['name'].lower()
        if key in seen:
            continue
        seen.add(key)
        normalized.append(field)

    return normalized


def _sanitize_template_values(payload: dict | None) -> dict:
    source = payload if isinstance(payload, dict) else {}
    script_name = str(source.get('script_name') or '').strip()
    display_name = str(source.get('display_name') or '').strip()
    category = str(source.get('category') or 'General').strip() or 'General'
    description = str(source.get('description') or '').strip()
    endpoint = str(source.get('endpoint') or '').strip() or None
    input_schema = normalize_input_schema(source.get('input_schema'))

    return {
        'script_name': script_name,
        'display_name': display_name,
        'category': category,
        'description': description,
        'input_schema': input_schema,
        'endpoint': endpoint,
    }


def _serialize_template(row: FlowTemplate) -> dict:
    return {
        'id': int(row.id),
        'script_name': row.script_name,
        'display_name': row.display_name,
        'category': row.category,
        'description': row.description or '',
        'input_schema': normalize_input_schema(row.input_schema),
        'endpoint': row.endpoint or '',
        'created_at': row.created_at.isoformat() if row.created_at else None,
        'updated_at': row.updated_at.isoformat() if row.updated_at else None,
    }


def list_flow_templates() -> list[dict]:
    init_platform_db()
    session = SessionLocal()
    try:
        rows = session.query(FlowTemplate).order_by(desc(FlowTemplate.updated_at), desc(FlowTemplate.id)).all()
        return [_serialize_template(row) for row in rows]
    finally:
        session.close()


def get_flow_template(template_id: int) -> dict | None:
    init_platform_db()
    session = SessionLocal()
    try:
        row = session.get(FlowTemplate, int(template_id or 0))
        return _serialize_template(row) if row is not None else None
    finally:
        session.close()


def create_flow_template(payload: dict | None) -> dict:
    values = _sanitize_template_values(payload)
    if not values['script_name']:
        raise ValueError('script_name is required')
    if not values['display_name']:
        raise ValueError('display_name is required')

    init_platform_db()
    session = SessionLocal()
    try:
        row = FlowTemplate(
            script_name=values['script_name'],
            display_name=values['display_name'],
            category=values['category'],
            description=values['description'],
            input_schema=values['input_schema'],
            endpoint=values['endpoint'],
            created_at=_utc_now(),
            updated_at=_utc_now(),
        )
        session.add(row)
        session.commit()
        session.refresh(row)
        return _serialize_template(row)
    finally:
        session.close()


def update_flow_template(template_id: int, payload: dict | None) -> dict | None:
    values = _sanitize_template_values(payload)

    init_platform_db()
    session = SessionLocal()
    try:
        row = session.get(FlowTemplate, int(template_id or 0))
        if row is None:
            return None

        if values['script_name']:
            row.script_name = values['script_name']
        if values['display_name']:
            row.display_name = values['display_name']

        row.category = values['category']
        row.description = values['description']
        row.input_schema = values['input_schema']
        row.endpoint = values['endpoint']
        row.updated_at = _utc_now()

        session.add(row)
        session.commit()
        session.refresh(row)
        return _serialize_template(row)
    finally:
        session.close()


def delete_flow_template(template_id: int) -> bool:
    init_platform_db()
    session = SessionLocal()
    try:
        row = session.get(FlowTemplate, int(template_id or 0))
        if row is None:
            return False

        session.delete(row)
        session.commit()
        return True
    finally:
        session.close()


def run_flow_definition(template: dict, variables: dict | None, user_id: int | None):
    endpoint = str(template.get('endpoint') or '').strip() or _default_endpoint()
    if not endpoint:
        raise RuntimeError('No flow endpoint configured for this template')
    script_name = str(template.get('script_name') or '').strip()
    if not script_name:
        raise ValueError('script_name is required')
    timeout = int(os.getenv('POWER_AUTOMATE_GROUP_TIMEOUT_SECONDS', str(DEFAULT_TIMEOUT_SECONDS)))
    payload = {
        'scriptName': script_name,
        'variables': variables if isinstance(variables, dict) else {},
    }

    flow_name = str(template.get('display_name') or script_name or 'Flow Template').strip()

    def _execute():
        response = requests.post(
            endpoint,
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=timeout,
        )
        response.raise_for_status()
        try:
            parsed = response.json()
        except ValueError:
            parsed = {'raw': response.text or ''}

        # Persist flow results through strict script-to-handler routing.
        route_flow_result(script_name, parsed)

        return {
            'template_id': int(template.get('id') or 0),
            'flow_name': flow_name,
            'script_name': script_name,
            'status_code': int(response.status_code),
            'response': parsed,
        }

    return track_flow_run(
        flow_name,
        int(user_id) if user_id is not None else None,
        payload,
        _execute,
    )


def run_flow_template(template_id: int, variables: dict | None, user_id: int | None):
    template = get_flow_template(template_id)
    if template is None:
        raise ValueError('Flow template not found')
    return run_flow_definition(template, variables, user_id)

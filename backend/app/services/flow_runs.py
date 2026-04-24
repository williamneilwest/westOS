from __future__ import annotations

import json
import time
from datetime import datetime, timezone

from sqlalchemy import desc

from ..models.platform import FlowRun, SessionLocal, init_platform_db


MAX_STORED_JSON_CHARS = 20000


def _utc_now():
    return datetime.now(timezone.utc)


def _to_json_text(value, max_chars: int = MAX_STORED_JSON_CHARS) -> str:
    try:
        encoded = json.dumps(value, ensure_ascii=False, default=str)
    except TypeError:
        encoded = json.dumps(str(value), ensure_ascii=False)
    if len(encoded) <= max_chars:
        return encoded
    return f'{encoded[:max_chars]}...<truncated>'


def _preview(value: str | None, max_chars: int = 600) -> str:
    text = str(value or '')
    if len(text) <= max_chars:
        return text
    return f'{text[:max_chars]}...'


def create_flow_run(
    *,
    flow_name: str,
    user_id: int | None,
    input_payload=None,
    output_payload=None,
    status: str = 'success',
    error_message: str = '',
    duration_ms: int = 0,
) -> int:
    init_platform_db()
    session = SessionLocal()
    try:
        run = FlowRun(
            flow_name=str(flow_name or '').strip() or 'unknown_flow',
            user_id=int(user_id) if user_id is not None else None,
            input_json=_to_json_text(input_payload),
            output_json=_to_json_text(output_payload) if output_payload is not None else None,
            status=str(status or 'success').strip().lower() or 'success',
            error_message=str(error_message or '').strip() or None,
            duration_ms=max(0, int(duration_ms or 0)),
            created_at=_utc_now(),
        )
        session.add(run)
        session.commit()
        session.refresh(run)
        return int(run.id)
    finally:
        session.close()


def list_flow_runs(*, user_id: int | None, is_admin: bool, flow_name: str = '', status: str = '', owner: str = '', limit: int = 100):
    init_platform_db()
    session = SessionLocal()
    try:
        query = session.query(FlowRun)

        if not is_admin:
            query = query.filter(FlowRun.user_id == int(user_id or 0))
        elif owner.strip():
            try:
                query = query.filter(FlowRun.user_id == int(owner))
            except (TypeError, ValueError):
                pass

        normalized_flow = str(flow_name or '').strip().lower()
        if normalized_flow:
            query = query.filter(FlowRun.flow_name.ilike(f'%{normalized_flow}%'))

        normalized_status = str(status or '').strip().lower()
        if normalized_status:
            query = query.filter(FlowRun.status == normalized_status)

        rows = (
            query
            .order_by(desc(FlowRun.created_at), desc(FlowRun.id))
            .limit(max(1, min(int(limit or 100), 300)))
            .all()
        )
        return [
            {
                'id': int(row.id),
                'flow_name': row.flow_name,
                'user_id': row.user_id,
                'status': row.status,
                'duration_ms': int(row.duration_ms or 0),
                'created_at': row.created_at.isoformat() if row.created_at else None,
                'error_message': row.error_message or '',
                'input_preview': _preview(row.input_json),
                'output_preview': _preview(row.output_json),
            }
            for row in rows
        ]
    finally:
        session.close()


def get_flow_run(run_id: int):
    init_platform_db()
    session = SessionLocal()
    try:
        row = session.get(FlowRun, int(run_id or 0))
        if row is None:
            return None
        return {
            'id': int(row.id),
            'flow_name': row.flow_name,
            'user_id': row.user_id,
            'input_json': row.input_json or '',
            'output_json': row.output_json or '',
            'status': row.status,
            'error_message': row.error_message or '',
            'duration_ms': int(row.duration_ms or 0),
            'created_at': row.created_at.isoformat() if row.created_at else None,
        }
    finally:
        session.close()


def track_flow_run(flow_name: str, user_id: int | None, input_payload, executor):
    started = time.perf_counter()
    try:
        output = executor()
        duration_ms = int((time.perf_counter() - started) * 1000)
        create_flow_run(
            flow_name=flow_name,
            user_id=user_id,
            input_payload=input_payload,
            output_payload=output,
            status='success',
            duration_ms=duration_ms,
        )
        return output
    except Exception as error:
        duration_ms = int((time.perf_counter() - started) * 1000)
        create_flow_run(
            flow_name=flow_name,
            user_id=user_id,
            input_payload=input_payload,
            output_payload=None,
            status='error',
            error_message=str(error),
            duration_ms=duration_ms,
        )
        raise

from __future__ import annotations

import base64
from binascii import Error as BinasciiError
import json
from io import BytesIO, StringIO
from pathlib import Path
from time import perf_counter
from typing import Any

from flask import Blueprint, current_app, jsonify, request, send_file
import pandas as pd

from ..auth import auth_required, get_current_user
from ..api_response import error_response, success_response
from ..db import db
from ..models import FlowRun



flows_bp = Blueprint('flows', __name__)

FLOW_OUTPUT_DIR = Path('/app/backend/flow_outputs')
CURRENT_SOURCE_PATH = FLOW_OUTPUT_DIR / 'current_source.json'

FRIENDLY_COLUMN_RENAMES = {
    'short_description': 'title',
    'assigned_to': 'assignee',
    'state': 'status',
    'opened_at': 'created_at',
    'sys_updated_on': 'updated_at',
    'priority': 'priority',
    'description': 'description',
    'location': 'location',
    'department': 'department',
}

REQUIRED_TICKET_COLUMNS = [
    'ticket_number',
    'sys_id',
    'title',
    'assignee',
    'assignment_group',
    'state',
    'status',
    'priority',
    'category',
    'subcategory',
    'contact_type',
    'location',
    'cmdb_ci',
    'opened_by',
    'caller_id',
    'affected_user',
    'description',
    'short_description',
    'comments',
    'work_notes',
    'latest_comment',
    'latest_work_note',
    'sys_updated_on',
    'created_at',
    'updated_at',
]


def _decode_file_content(file_content: str) -> bytes:
    raw = (file_content or '').strip()
    if not raw:
        raise ValueError('file_content is required')

    print('INPUT TYPE CHECK:', raw[:100])

    try:
        if raw.startswith('{') or raw.startswith('"'):
            parsed = json.loads(raw)
            if isinstance(parsed, str):
                raw = parsed
    except Exception:
        pass

    sniff = raw[:1000].lower()
    looks_like_raw_csv = (
        (',' in sniff and '\n' in sniff)
        or sniff.startswith('"')
        or 'short_description' in sniff
        or 'number,' in sniff
        or 'u_task' in sniff
    )
    if looks_like_raw_csv and not raw.startswith('data:'):
        decoded = raw.encode('utf-8', errors='ignore')
        print('DECODE MODE:', 'raw text fallback')
        print('DECODED SIZE:', len(decoded))
        return decoded

    candidate = raw
    if candidate.lower().startswith('data:') and ',' in candidate:
        candidate = candidate.split(',', 1)[1]
    candidate = candidate.replace('\n', '').replace('\r', '').strip()
    candidate += '=' * ((4 - len(candidate) % 4) % 4)

    try:
        decoded = base64.b64decode(candidate, validate=False)
        print('DECODE MODE:', 'base64')
        print('DECODED SIZE:', len(decoded))
        return decoded
    except (BinasciiError, ValueError):
        decoded = raw.encode('utf-8', errors='ignore')
        print('DECODE MODE:', 'raw text fallback')
        print('DECODED SIZE:', len(decoded))
        return decoded


def _parse_uploaded_file(decoded_bytes: bytes, file_name: str) -> tuple[pd.DataFrame, str]:
    suffix = Path(file_name).suffix.lower()
    if suffix in {'.xlsx', '.xls'}:
        return pd.read_excel(BytesIO(decoded_bytes), dtype=str), 'excel'

    decoded_text = decoded_bytes.decode('utf-8', errors='ignore')
    decoded_text = decoded_text.replace('\r\n', '\n').replace('\x00', '')
    try:
        df = pd.read_csv(
            StringIO(decoded_text),
            sep=None,
            engine='python',
            quotechar='"',
            doublequote=True,
            on_bad_lines='skip',
            skip_blank_lines=True,
            dtype=str,
        )
        return df, 'csv'
    except Exception as csv_error:
        try:
            return pd.read_excel(BytesIO(decoded_bytes), dtype=str), 'excel'
        except Exception as excel_error:
            raise ValueError(f'Failed to parse file. CSV error: {csv_error}; Excel error: {excel_error}') from excel_error


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    normalized_columns: list[str] = []
    for column in df.columns:
        value = str(column).strip().lower()
        if value.startswith('u_task_1.'):
            value = value[len('u_task_1.'):]
        if value.startswith('u_'):
            value = value[2:]
        normalized_columns.append(value)
    df.columns = normalized_columns

    rename_map = dict(FRIENDLY_COLUMN_RENAMES)

    if 'ticket_number' not in df.columns:
        if 'number' in df.columns:
            rename_map['number'] = 'ticket_number'
        elif 'ticket' in df.columns:
            rename_map['ticket'] = 'ticket_number'
        elif 'incident' in df.columns:
            rename_map['incident'] = 'ticket_number'
        else:
            for candidate in df.columns:
                if any(token in candidate for token in ('number', 'ticket', 'incident')):
                    rename_map[candidate] = 'ticket_number'
                    break

    df = df.rename(columns=rename_map)

    # Keep every input column while guaranteeing unique names for pandas-safe processing.
    if not df.columns.is_unique:
        duplicates = df.columns[df.columns.duplicated()].tolist()
        print('DUPLICATE COLUMNS DETECTED:', duplicates)
        seen: dict[str, int] = {}
        unique_columns: list[str] = []
        for column in df.columns:
            if column not in seen:
                seen[column] = 0
                unique_columns.append(column)
            else:
                seen[column] += 1
                unique_columns.append(f'{column}_{seen[column]}')
        df.columns = unique_columns

    print('COLUMNS AFTER NORMALIZATION:', df.columns.tolist())
    df = df.fillna('')

    if 'ticket_number' not in df.columns:
        fallback_source = str(df.columns[0]) if len(df.columns) > 0 else None
        if fallback_source:
            df['ticket_number'] = df[fallback_source].astype(str).str.strip()
        else:
            df['ticket_number'] = [f'TKT-{idx + 1}' for idx in range(len(df))]

    df['ticket_number'] = df['ticket_number'].astype(str).str.strip()
    missing_ticket_number = df['ticket_number'].eq('')
    if missing_ticket_number.any():
        df.loc[missing_ticket_number, 'ticket_number'] = [f'TKT-{idx + 1}' for idx in df.index[missing_ticket_number]]

    for column in REQUIRED_TICKET_COLUMNS:
        if column not in df.columns:
            df[column] = ''

    # Keep both fields so UI can use clear naming while preserving source semantics.
    if 'state' not in df.columns and 'status' in df.columns:
        df['state'] = df['status']
    if 'status' not in df.columns and 'state' in df.columns:
        df['status'] = df['state']
    if 'sys_updated_on' not in df.columns and 'updated_at' in df.columns:
        df['sys_updated_on'] = df['updated_at']

    def _latest_note(raw: Any) -> str:
        text = str(raw or '').strip()
        if not text:
            return ''
        chunks = [part.strip() for part in text.replace('\r\n', '\n').split('\n\n') if part.strip()]
        return chunks[-1] if chunks else text

    df['latest_comment'] = df.get('comments', '').map(_latest_note) if 'comments' in df.columns else ''
    df['latest_work_note'] = df.get('work_notes', '').map(_latest_note) if 'work_notes' in df.columns else ''

    return df


def _apply_ticket_recency_flags(df: pd.DataFrame) -> pd.DataFrame:
    working = df.copy()
    if 'updated_at' not in working.columns:
        working['updated_at'] = ''
    if 'created_at' not in working.columns:
        working['created_at'] = ''
    if 'ticket_number' not in working.columns:
        working['ticket_number'] = ''

    print('FINAL COLUMNS:', working.columns.tolist())
    assert working.columns.is_unique, 'Column names must be unique before processing'

    if isinstance(working['updated_at'], pd.DataFrame):
        working['updated_at'] = working['updated_at'].iloc[:, 0]
    if isinstance(working['created_at'], pd.DataFrame):
        working['created_at'] = working['created_at'].iloc[:, 0]

    working['updated_at'] = pd.to_datetime(working['updated_at'], errors='coerce', utc=True)
    working['created_at'] = pd.to_datetime(working['created_at'], errors='coerce', utc=True)
    working['effective_updated_at'] = working['updated_at'].fillna(working['created_at'])

    now = pd.Timestamp.utcnow()
    working['last_update_days'] = (now - working['effective_updated_at']).dt.total_seconds() / 86400
    working['last_update_days'] = working['last_update_days'].fillna(0).clip(lower=0)
    working['age_days'] = ((now - working['created_at']).dt.total_seconds() / 86400).fillna(0).clip(lower=0)
    working['is_stale'] = working['last_update_days'] >= 3
    working['is_urgent'] = working['last_update_days'] >= 5

    print('STALE COUNT:', int(working['is_stale'].sum()))
    print('URGENT COUNT:', int(working['is_urgent'].sum()))
    print(working[['ticket_number', 'updated_at', 'last_update_days']].head(10).to_string(index=False))

    working['created_at'] = working['created_at'].dt.strftime('%Y-%m-%d %H:%M:%S').fillna('')
    working['updated_at'] = working['updated_at'].dt.strftime('%Y-%m-%d %H:%M:%S').fillna('')
    working['effective_updated_at'] = working['effective_updated_at'].dt.strftime('%Y-%m-%d %H:%M:%S').fillna('')
    working['last_update_days'] = working['last_update_days'].round(2)
    working['age_days'] = working['age_days'].round(2)
    return working


def _status_bucket(value: str) -> str:
    raw = (value or '').strip().lower()
    if raw in {'closed', 'resolved', 'complete', 'completed', 'done'}:
        return 'closed'
    if raw in {'in progress', 'in_progress', 'working', 'wip'}:
        return 'in_progress'
    return 'open'


def _record_subset(df: pd.DataFrame) -> pd.DataFrame:
    preferred = [
        'ticket_number', 'title', 'assignee', 'assignment_group', 'status', 'state', 'priority',
        'category', 'subcategory', 'contact_type', 'location', 'cmdb_ci',
        'opened_by', 'caller_id', 'affected_user',
        'latest_comment', 'latest_work_note',
        'created_at', 'updated_at', 'last_update_days', 'age_days', 'is_stale', 'is_urgent',
    ]
    columns = [column for column in preferred if column in df.columns]
    if not columns:
        columns = list(df.columns[:8])
    return df[columns]


def _priority_rank(value: str) -> int:
    raw = (value or '').strip().lower()
    if raw.startswith('1'):
        return 1
    if raw.startswith('2'):
        return 2
    if raw.startswith('3'):
        return 3
    return 9


def _build_assignee_summary(
    assignee: str,
    ticket_count: int,
    stale_count: int,
    high_priority_count: int,
    oldest_tickets: pd.DataFrame,
    high_priority_tickets: pd.DataFrame,
) -> str:
    lines: list[str] = [
        f'Assignee: {assignee}',
        f'Tickets: {ticket_count}',
        f'Stale tickets: {stale_count}',
        f'High-priority tickets: {high_priority_count}',
        '',
        'Recommended order:',
    ]

    recommended = pd.concat([high_priority_tickets.head(5), oldest_tickets.head(5)], ignore_index=True)
    recommended = recommended.drop_duplicates(subset=['ticket_number']).head(5)
    if recommended.empty:
        lines.append('- No immediate priorities detected.')
    else:
        for _, row in recommended.iterrows():
            ticket_number = str(row.get('ticket_number') or 'Unknown')
            title = str(row.get('title') or 'Untitled')
            priority = str(row.get('priority') or 'Unknown')
            age_days = row.get('age_days')
            age_display = f"{float(age_days):.0f}" if age_days not in (None, '') else '0'
            lines.append(f'- {ticket_number}: {title} (priority {priority}, age {age_display}d)')

    lines.extend(
        [
            '',
            'Action plan:',
            '- Resolve high-priority tickets first.',
            '- Update or escalate stale tickets older than 3 days.',
            '- Close or reassign tickets with no recent updates.',
        ]
    )
    return '\n'.join(lines)


def build_ticket_analytics(df: pd.DataFrame) -> dict[str, Any]:
    working = df.copy()
    required_recency = {'last_update_days', 'is_stale', 'is_urgent', 'age_days'}
    if not required_recency.issubset(set(working.columns)):
        working = _apply_ticket_recency_flags(working)

    for column, fallback in (
        ('title', ''),
        ('status', ''),
        ('assignee', 'Unassigned'),
        ('priority', 'Unknown'),
        ('created_at', ''),
        ('updated_at', ''),
        ('ticket_number', ''),
    ):
        if column not in working.columns:
            working[column] = fallback

    working['status'] = working['status'].astype(str).fillna('')
    working['assignee'] = working['assignee'].astype(str).fillna('Unassigned').replace({'': 'Unassigned'})
    working['priority'] = working['priority'].astype(str).fillna('Unknown').replace({'': 'Unknown'})
    working['ticket_number'] = working['ticket_number'].astype(str).fillna('')

    working['status_bucket'] = working['status'].map(_status_bucket)

    by_assignee = [
        {'assignee': str(key), 'count': int(value)}
        for key, value in working['assignee'].value_counts(dropna=False).head(10).items()
    ]
    by_priority = [
        {'priority': str(key), 'count': int(value)}
        for key, value in working['priority'].value_counts(dropna=False).items()
    ]
    by_status = [
        {'status': str(key) or 'Unknown', 'count': int(value)}
        for key, value in working['status'].value_counts(dropna=False).items()
    ]

    oldest = _record_subset(working.sort_values('age_days', ascending=False)).head(10).fillna('').to_dict(orient='records')
    recent = _record_subset(working.sort_values('created_at', ascending=False)).head(10).fillna('').to_dict(orient='records')

    return {
        'summary': {
            'total': int(len(working)),
            'open': int((working['status_bucket'] == 'open').sum()),
            'closed': int((working['status_bucket'] == 'closed').sum()),
            'in_progress': int((working['status_bucket'] == 'in_progress').sum()),
        },
        'aging': {
            'over_1_day': int((working['age_days'] > 1).sum()),
            'over_3_days': int((working['age_days'] > 3).sum()),
            'over_7_days': int((working['age_days'] > 7).sum()),
        },
        'by_assignee': by_assignee,
        'by_priority': by_priority,
        'by_status': by_status,
        'oldest_tickets': oldest,
        'recent_tickets': recent,
    }


def _save_processed_excel(df: pd.DataFrame, flow_id: str, file_name: str) -> str:
    FLOW_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    stem = Path(file_name).stem or 'processed'
    output_name = f'{stem}_{flow_id}.xlsx'
    output_path = FLOW_OUTPUT_DIR / output_name
    df.to_excel(output_path, index=False, engine='openpyxl')
    return str(output_path)


def _preview_json(df: pd.DataFrame) -> str:
    return json.dumps(df.head(10).fillna('').to_dict(orient='records'))


def _rows_json(df: pd.DataFrame, limit: int = 1000) -> list[dict[str, Any]]:
    return df.head(limit).fillna('').to_dict(orient='records')


def _read_current_source() -> str | None:
    if not CURRENT_SOURCE_PATH.exists() or not CURRENT_SOURCE_PATH.is_file():
        return None
    try:
        payload = json.loads(CURRENT_SOURCE_PATH.read_text(encoding='utf-8'))
    except Exception:
        return None
    file_name = str(payload.get('file') or '').strip()
    return file_name or None


def _write_current_source(file_name: str) -> None:
    FLOW_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    payload: dict[str, str] = {}
    if CURRENT_SOURCE_PATH.exists():
        try:
            payload = json.loads(CURRENT_SOURCE_PATH.read_text(encoding='utf-8'))
        except Exception:
            payload = {}
    payload['file'] = file_name
    CURRENT_SOURCE_PATH.write_text(json.dumps(payload), encoding='utf-8')


def _resolve_source_file() -> Path:
    selected = _read_current_source()
    if selected:
        selected_flow = FlowRun.query.filter_by(status='Success').filter(FlowRun.processed_file_path.endswith(selected)).order_by(FlowRun.created_at.desc()).first()
        if selected_flow and selected_flow.processed_file_path:
            selected_path = Path(selected_flow.processed_file_path)
            if selected_path.exists() and selected_path.is_file():
                return selected_path

    fallback_flow = FlowRun.query.filter_by(status='Success').order_by(FlowRun.created_at.desc()).first()
    if not fallback_flow or not fallback_flow.processed_file_path:
        raise FileNotFoundError('No dataset uploaded yet')
    fallback_path = Path(fallback_flow.processed_file_path)
    if not fallback_path.exists() or not fallback_path.is_file():
        raise FileNotFoundError('No dataset uploaded yet')
    _write_current_source(fallback_path.name)
    return fallback_path


def _load_source_dataframe() -> tuple[Path, pd.DataFrame]:
    source_path = _resolve_source_file()
    df = pd.read_excel(source_path, dtype=str).fillna('')
    df = _apply_ticket_recency_flags(normalize_columns(df))
    return source_path, df


@flows_bp.post('/flows/upload-csv', strict_slashes=False)
@auth_required
def upload_csv_flow():
    user = get_current_user()
    payload = request.get_json(silent=True) or {}
    file_name = str(payload.get('file_name') or '').strip()
    file_content = str(payload.get('file_content') or '').strip()
    started = perf_counter()

    if not file_name:
        return error_response('file_name is required', 400)
    if not file_content:
        return error_response('file_content is required', 400)

    flow_run = FlowRun(user_id=user.id, file_name=file_name, status='Failed', row_count=0, column_count=0)
    db.session.add(flow_run)
    db.session.flush()

    try:
        decoded_bytes = _decode_file_content(file_content)
        df, file_type = _parse_uploaded_file(decoded_bytes, file_name)
        df = _apply_ticket_recency_flags(normalize_columns(df).fillna(''))
        if df.empty:
            raise ValueError('File parsed but contains no valid rows')

        analytics = build_ticket_analytics(df)

        flow_run.row_count = int(df.shape[0])
        flow_run.column_count = int(df.shape[1])
        flow_run.raw_preview_json = _preview_json(df)
        flow_run.processed_file_path = _save_processed_excel(df, flow_run.id, file_name)
        flow_run.status = 'Success'
        flow_run.error_message = None
        flow_run.processing_time_ms = int((perf_counter() - started) * 1000)
        db.session.commit()

        _write_current_source(Path(flow_run.processed_file_path).name)

        return {
            'success': True,
            'flow_id': flow_run.id,
            'file_type': file_type,
            'rows_processed': flow_run.row_count,
            'rows': int(df.shape[0]),
            'columns': [str(column) for column in df.columns.tolist()],
            'preview': _rows_json(df, limit=10),
            'analytics': analytics,
        }, 201
    except Exception as error:  # noqa: BLE001
        db.session.rollback()
        failed = FlowRun.query.get(flow_run.id) or FlowRun(
            id=flow_run.id,
            user_id=user.id,
            file_name=file_name,
            row_count=0,
            column_count=0,
            status='Failed',
        )
        db.session.add(failed)
        failed.status = 'Failed'
        failed.error_message = str(error)
        failed.processing_time_ms = int((perf_counter() - started) * 1000)
        db.session.commit()
        current_app.logger.exception('[FLOWS] upload-csv failed: %s', error)
        return {'success': False, 'error': str(error)}, 400


@flows_bp.get('/flows/recent', strict_slashes=False)
@auth_required
def get_recent_flows():
    flows = FlowRun.query.order_by(FlowRun.created_at.desc()).limit(10).all()
    return success_response({'flows': [flow.to_dict(include_preview=False) for flow in flows]})


@flows_bp.get('/flows/<string:flow_id>', strict_slashes=False)
@auth_required
def get_flow_details(flow_id: str):
    flow = FlowRun.query.filter_by(id=flow_id).first_or_404()
    return success_response({'flow': flow.to_dict(include_preview=True)})


@flows_bp.get('/flows/latest-ticket-dashboard', strict_slashes=False)
@auth_required
def get_latest_ticket_dashboard():
    try:
        source_path, df = _load_source_dataframe()
    except FileNotFoundError as error:
        return error_response(str(error), 404)
    except Exception as error:  # noqa: BLE001
        current_app.logger.exception('[FLOWS] latest-ticket-dashboard failed: %s', error)
        return error_response('Failed to load ticket dashboard dataset', 500)

    analytics = build_ticket_analytics(df)
    return success_response({
        'file_name': source_path.name,
        'updated_at': pd.to_datetime(source_path.stat().st_mtime, unit='s', utc=True).isoformat(),
        'rows': int(df.shape[0]),
        'columns': [str(column) for column in df.columns.tolist()],
        'preview': _rows_json(df, limit=10),
        'tickets': _rows_json(df, limit=1000),
        'analytics': analytics,
    })


@flows_bp.get('/tickets/latest', strict_slashes=False)
@auth_required
def get_latest_tickets():
    try:
        _, df = _load_source_dataframe()
        records = _rows_json(df, limit=2000)
        print('RETURNING DATA COUNT:', len(records))
        return jsonify({
            'success': True,
            'data': records,
            'count': len(records),
        }), 200
    except FileNotFoundError:
        return jsonify({
            'success': False,
            'error': 'No dataset uploaded yet',
            'data': [],
            'count': 0,
        }), 404
    except Exception as error:  # noqa: BLE001
        current_app.logger.exception('[TICKETS] latest failed: %s', error)
        return jsonify({
            'success': False,
            'error': str(error),
            'data': [],
            'count': 0,
        }), 500


@flows_bp.post('/tickets/set-source', strict_slashes=False)
@auth_required
def set_tickets_source():
    payload = request.get_json(silent=True) or {}
    file_name = str(payload.get('file_name') or '').strip()
    if not file_name:
        return error_response('file_name is required', 400)
    if not file_name.startswith('ActiveTickets'):
        return error_response('file_name must start with ActiveTickets', 400)
    if Path(file_name).name != file_name:
        return error_response('file_name must not include a path', 400)

    source_flow = FlowRun.query.filter_by(status='Success').filter(FlowRun.processed_file_path.endswith(file_name)).order_by(FlowRun.created_at.desc()).first()
    if not source_flow or not source_flow.processed_file_path:
        return error_response('Requested source file does not exist', 404)

    _write_current_source(file_name)
    return success_response({'set': True, 'file_name': file_name})


@flows_bp.post('/tickets/analyze-user', strict_slashes=False)
@auth_required
def analyze_user_tickets():
    payload = request.get_json(silent=True) or {}
    assignee = str(payload.get('assignee') or '').strip()
    if not assignee:
        return error_response('assignee is required', 400)

    try:
        _, df = _load_source_dataframe()
    except FileNotFoundError as error:
        return error_response(str(error), 404)
    except Exception as error:  # noqa: BLE001
        current_app.logger.exception('[TICKETS] analyze-user load failed: %s', error)
        return error_response('Failed to load latest dataset', 500)

    if 'assignee' not in df.columns:
        return error_response('Dataset does not include assignee column', 400)

    assignee_series = df['assignee'].astype(str).str.strip()
    user_df = df[assignee_series.str.lower() == assignee.lower()].copy()
    if user_df.empty:
        return error_response('No tickets found for this assignee', 404)

    user_df = _apply_ticket_recency_flags(user_df)
    user_df['priority_rank'] = user_df.get('priority', '').astype(str).map(_priority_rank)

    columns = ['ticket_number', 'title', 'age_days', 'last_update_days', 'priority', 'status']
    for column in columns:
        if column not in user_df.columns:
            user_df[column] = ''

    oldest_tickets = user_df.sort_values('age_days', ascending=False).head(10)
    stale_tickets = user_df[user_df['is_stale']].sort_values('last_update_days', ascending=False)
    high_priority_tickets = user_df[user_df['priority_rank'] <= 2].sort_values(['priority_rank', 'age_days'], ascending=[True, False])

    analysis = _build_assignee_summary(
        assignee=assignee,
        ticket_count=int(len(user_df)),
        stale_count=int(len(stale_tickets)),
        high_priority_count=int(len(high_priority_tickets)),
        oldest_tickets=oldest_tickets,
        high_priority_tickets=high_priority_tickets,
    )

    return success_response(
        {
            'analysis': analysis,
            'assignee': assignee,
            'ticket_count': int(len(user_df)),
            'oldest_count': int(len(oldest_tickets)),
            'stale_count': int(len(stale_tickets)),
            'high_priority_count': int(len(high_priority_tickets)),
        }
    )


@flows_bp.get('/flows/<string:flow_id>/download', strict_slashes=False)
@auth_required
def download_flow_output(flow_id: str):
    flow = FlowRun.query.filter_by(id=flow_id).first_or_404()
    output_path = Path(flow.processed_file_path or '')
    if flow.status != 'Success' or not output_path.exists() or not output_path.is_file():
        return error_response('Processed file not available', 404)

    file_bytes = output_path.read_bytes()
    return send_file(
        BytesIO(file_bytes),
        as_attachment=True,
        download_name=output_path.name,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )

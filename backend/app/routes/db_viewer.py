from datetime import date, datetime
from decimal import Decimal

from flask import Blueprint, current_app, request
from sqlalchemy import inspect, select
from sqlalchemy.sql.schema import Table

from ..api_response import error_response, success_response
from ..db import db


db_viewer_bp = Blueprint('db_viewer', __name__)


def _serialize_value(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    return value


def _get_reflected_table(table_name: str) -> Table | None:
    inspector = inspect(db.engine)
    allowed_tables = set(inspector.get_table_names())
    if table_name not in allowed_tables:
        return None
    return Table(table_name, db.metadata, autoload_with=db.engine)


def _primary_key_column(table: Table):
    pk_columns = list(table.primary_key.columns)
    if len(pk_columns) != 1:
        return None
    return pk_columns[0]


def _coerce_identifier(raw_value: str, python_type: type | None):
    if python_type is int:
        return int(raw_value)
    if python_type is float:
        return float(raw_value)
    return raw_value


def _serializable_row(row: dict[str, object]) -> dict[str, object]:
    return {key: _serialize_value(value) for key, value in row.items()}


def _row_by_id(table: Table, pk_name: str, record_id: object) -> dict[str, object] | None:
    row = db.session.execute(select(table).where(table.c[pk_name] == record_id)).mappings().first()
    if row is None:
        return None
    return _serializable_row(dict(row))


@db_viewer_bp.route('/db/tables', methods=['GET'], strict_slashes=False)
def get_tables():
    current_app.logger.info('[DB] Fetching tables')
    tables = inspect(db.engine).get_table_names()
    return success_response(sorted(tables))


@db_viewer_bp.get('/db/table/<string:table_name>', strict_slashes=False)
def get_table_rows(table_name: str):
    current_app.logger.info('[DB] Fetching table: %s', table_name)

    table = _get_reflected_table(table_name)
    if table is None:
        return error_response('Unknown table', 404)

    rows = db.session.execute(select(table)).mappings().all()
    normalized_rows = [{key: _serialize_value(value) for key, value in row.items()} for row in rows]

    return success_response(normalized_rows)


@db_viewer_bp.get('/db/<string:table_name>', strict_slashes=False)
def get_table_records(table_name: str):
    table = _get_reflected_table(table_name)
    if table is None:
        return error_response('Unknown table', 404)
    rows = db.session.execute(select(table)).mappings().all()
    return success_response([_serializable_row(dict(row)) for row in rows])


@db_viewer_bp.post('/db/<string:table_name>', strict_slashes=False)
def create_table_record(table_name: str):
    table = _get_reflected_table(table_name)
    if table is None:
        return error_response('Unknown table', 404)

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response('JSON object payload is required', 400)

    valid_columns = {column.name for column in table.columns}
    insert_payload = {key: value for key, value in payload.items() if key in valid_columns}
    if not insert_payload:
        return error_response('No valid fields provided', 400)

    pk_column = _primary_key_column(table)
    pk_name = pk_column.name if pk_column is not None else None

    try:
        result = db.session.execute(table.insert().values(**insert_payload))
        db.session.commit()
        if pk_name and result.inserted_primary_key:
            created = _row_by_id(table, pk_name, result.inserted_primary_key[0])
            if created:
                return success_response(created, 201)
        return success_response(insert_payload, 201)
    except Exception as error:  # noqa: BLE001
        db.session.rollback()
        current_app.logger.exception('[DB] create record failed for %s: %s', table_name, error)
        return error_response(str(error), 400)


@db_viewer_bp.put('/db/<string:table_name>/<string:record_id>', strict_slashes=False)
def update_table_record(table_name: str, record_id: str):
    table = _get_reflected_table(table_name)
    if table is None:
        return error_response('Unknown table', 404)

    pk_column = _primary_key_column(table)
    if pk_column is None:
        return error_response('Only tables with a single-column primary key are supported', 400)

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response('JSON object payload is required', 400)

    update_payload = {key: value for key, value in payload.items() if key in table.c and key != pk_column.name}
    if not update_payload:
        return error_response('No valid fields provided for update', 400)

    try:
        record_identifier = _coerce_identifier(record_id, getattr(pk_column.type, 'python_type', None))
        result = db.session.execute(
            table.update().where(table.c[pk_column.name] == record_identifier).values(**update_payload)
        )
        if result.rowcount == 0:
            db.session.rollback()
            return error_response('Record not found', 404)
        db.session.commit()
        updated = _row_by_id(table, pk_column.name, record_identifier)
        return success_response(updated or update_payload)
    except Exception as error:  # noqa: BLE001
        db.session.rollback()
        current_app.logger.exception('[DB] update record failed for %s: %s', table_name, error)
        return error_response(str(error), 400)


@db_viewer_bp.delete('/db/<string:table_name>/<string:record_id>', strict_slashes=False)
def delete_table_record(table_name: str, record_id: str):
    table = _get_reflected_table(table_name)
    if table is None:
        return error_response('Unknown table', 404)

    pk_column = _primary_key_column(table)
    if pk_column is None:
        return error_response('Only tables with a single-column primary key are supported', 400)

    try:
        record_identifier = _coerce_identifier(record_id, getattr(pk_column.type, 'python_type', None))
        result = db.session.execute(table.delete().where(table.c[pk_column.name] == record_identifier))
        if result.rowcount == 0:
            db.session.rollback()
            return error_response('Record not found', 404)
        db.session.commit()
        return success_response({'deleted': True, 'id': record_id})
    except Exception as error:  # noqa: BLE001
        db.session.rollback()
        current_app.logger.exception('[DB] delete record failed for %s: %s', table_name, error)
        return error_response(str(error), 400)

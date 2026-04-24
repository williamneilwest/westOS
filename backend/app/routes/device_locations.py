import csv
import re
from datetime import datetime, timezone
from io import StringIO

from flask import Blueprint, Response, jsonify, request
from sqlalchemy import or_

from ..agents.device_location_agent import device_location_debug, find_matching_ticket_rows, search_device_locations
from ..models.data_sources import DataSource
from ..models.platform import SessionLocal, init_platform_db
from ..services.authz import require_admin
from ..services.data_sources.manager import get_source
from ..services.device_location_source_store import (
    DEFAULT_SOURCE_KEY,
    get_hardware_lookup_source_key,
    set_hardware_lookup_source_key,
)


device_locations_bp = Blueprint("device_locations", __name__)
HARDWARE_RMR_SOURCE_KEY = "ref_hardware"
DEVICE_NAME_PATTERN = re.compile(r"LAH[LD]\s?[A-Z0-9]{4,}", re.IGNORECASE)


def _csv_cell(values) -> str:
    if not isinstance(values, list):
        return ""
    return ", ".join(str(value).strip() for value in values if str(value).strip())


def _filename_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _normalize_device_name(value) -> str:
    return re.sub(r"\s+", "", str(value or "").upper()).strip()


def _detect_hardware_name_column(rows: list[dict]) -> str:
    if not isinstance(rows, list) or not rows:
        return ""

    counts = {}
    for row in rows:
        if not isinstance(row, dict):
            continue
        for key, value in row.items():
            column = str(key or "").strip()
            if not column:
                continue
            text = str(value or "").strip()
            if not text:
                continue
            if DEVICE_NAME_PATTERN.search(text):
                counts[column] = int(counts.get(column, 0) or 0) + 1

    if not counts:
        return ""
    return max(counts.items(), key=lambda item: item[1])[0]


def _search_hardware_rmr_rows(query: str, rows: list[dict], name_column: str, limit: int = 250) -> list[dict]:
    normalized_query = _normalize_device_name(query)
    if not normalized_query or not name_column:
        return []

    max_results = max(1, min(int(limit or 250), 1000))
    results = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        candidate = _normalize_device_name(row.get(name_column))
        if not candidate:
            continue
        if normalized_query in candidate:
            results.append(row)
        if len(results) >= max_results:
            break
    return results


def _resolve_source(session, source_key: str | None):
    normalized = str(source_key or "").strip()
    if not normalized:
        return None

    return (
        session.query(DataSource)
        .filter(
            or_(
                DataSource.key == normalized,
                DataSource.name == normalized,
            )
        )
        .first()
    )


def _load_data_from_configured_source(source_key: str | None):
    configured_key = str(source_key or "").strip() or get_hardware_lookup_source_key(DEFAULT_SOURCE_KEY)

    init_platform_db()
    session = SessionLocal()
    try:
        source = _resolve_source(session, configured_key)
        if source is None:
            return [], None
        source_name = str(source.name or "").strip()
        if not source_name:
            return [], source
        rows = get_source(source_name, normalized=False)
        if not isinstance(rows, list):
            return [], source
        return rows, source
    finally:
        session.close()


def _serialize_source_choice(source):
    if source is None:
        return None
    return {
        "id": int(source.id),
        "key": str(source.key or source.name or "").strip(),
        "name": str(source.display_name or source.name or source.key or "").strip(),
        "table_name": str(source.table_name or "").strip(),
        "row_count": int(source.row_count or 0),
    }


@device_locations_bp.get("/api/device-locations/source")
def get_device_location_source_route():
    configured_key = get_hardware_lookup_source_key(DEFAULT_SOURCE_KEY)

    init_platform_db()
    session = SessionLocal()
    try:
        sources = (
            session.query(DataSource)
            .order_by(DataSource.display_name.asc(), DataSource.name.asc(), DataSource.id.asc())
            .all()
        )
        source_options = [
            {
                "id": int(item.id),
                "key": str(item.key or item.name or "").strip(),
                "name": str(item.display_name or item.name or item.key or "").strip(),
                "table_name": str(item.table_name or "").strip(),
                "row_count": int(item.row_count or 0),
            }
            for item in sources
        ]

        selected = _resolve_source(session, configured_key)
        return jsonify(
            {
                "source_key": configured_key,
                "selected_source": _serialize_source_choice(selected),
                "sources": source_options,
            }
        )
    finally:
        session.close()


@device_locations_bp.put("/api/device-locations/source")
def update_device_location_source_route():
    auth_error = require_admin()
    if auth_error is not None:
        return auth_error

    payload = request.get_json(silent=True) or {}
    requested = str(payload.get("source_key") or payload.get("source") or "").strip()
    if not requested:
        return jsonify({"error": "source_key is required."}), 400

    init_platform_db()
    session = SessionLocal()
    try:
        source = _resolve_source(session, requested)
        if source is None:
            return jsonify({"error": "Data source not found."}), 404

        selected_key = str(source.key or source.name or "").strip()
        set_hardware_lookup_source_key(selected_key)
        return jsonify(
            {
                "status": "success",
                "source_key": selected_key,
                "selected_source": _serialize_source_choice(source),
            }
        )
    finally:
        session.close()


@device_locations_bp.post("/api/device-locations/search")
def search_device_locations_route():
    payload = request.get_json(silent=True) or {}
    query = str(payload.get("query") or "").strip()
    source_key = str(payload.get("source_key") or payload.get("source") or "").strip()
    data = payload.get("data")
    if data is not None and not isinstance(data, list):
        return jsonify({"error": "data must be an array of ticket records when provided."}), 400

    source = None
    if isinstance(data, list):
        rows = data
    else:
        rows, source = _load_data_from_configured_source(source_key)

    # Search across the full selected source dataset.
    results = search_device_locations(query=query, data=rows, recent_only=False)
    tickets = find_matching_ticket_rows(query=query, data=rows, limit=None, recent_only=False)
    debug = device_location_debug(rows, recent_only=False)
    return jsonify(
        {
            "count": len(results),
            "results": results,
            "tickets_count": len(tickets),
            "tickets": tickets,
            "source_key": str(source_key or get_hardware_lookup_source_key(DEFAULT_SOURCE_KEY)).strip(),
            "selected_source": _serialize_source_choice(source),
            "total_processed": int(debug.get("total_processed") or 0),
            "devices_found": int(debug.get("devices_found") or 0),
            "sample_devices": list(debug.get("sample_devices") or [])[:10],
        }
    )


@device_locations_bp.post("/api/device-locations/export")
def export_device_locations_route():
    payload = request.get_json(silent=True) or {}
    query = str(payload.get("query") or "").strip()
    source_key = str(payload.get("source_key") or payload.get("source") or "").strip()
    data = payload.get("data")
    if data is not None and not isinstance(data, list):
        return jsonify({"error": "data must be an array of ticket records when provided."}), 400

    if isinstance(data, list):
        rows = data
    else:
        rows, _ = _load_data_from_configured_source(source_key)

    results = search_device_locations(query=query, data=rows, recent_only=False)

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["Ticket", "Devices", "Rooms", "Floors", "Areas", "Confidence", "Source", "Opened At"])

    for row in results:
        writer.writerow(
            [
                str(row.get("ticket") or "").strip(),
                _csv_cell(row.get("devices") or []),
                _csv_cell(row.get("rooms") or []),
                _csv_cell(row.get("floors") or []),
                _csv_cell(row.get("areas") or []),
                str(row.get("confidence") or "").strip(),
                str(row.get("source") or "").strip(),
                str(row.get("opened_at") or "").strip(),
            ]
        )

    csv_body = output.getvalue()
    output.close()

    filename = f"device_locations_{_filename_stamp()}.csv"
    return Response(
        csv_body,
        mimetype="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
        },
    )


@device_locations_bp.get("/api/hardware-rmr/search")
def search_hardware_rmr_route():
    query = str(request.args.get("q") or "").strip()
    if not query:
        return jsonify(
            {
                "query": "",
                "source_key": HARDWARE_RMR_SOURCE_KEY,
                "search_column": "",
                "count": 0,
                "results": [],
            }
        )

    rows = get_source(HARDWARE_RMR_SOURCE_KEY, normalized=False)
    if not isinstance(rows, list):
        rows = []
    search_column = _detect_hardware_name_column(rows)
    results = _search_hardware_rmr_rows(query, rows, search_column, limit=250)

    return jsonify(
        {
            "query": query,
            "source_key": HARDWARE_RMR_SOURCE_KEY,
            "search_column": search_column,
            "count": len(results),
            "results": results,
        }
    )

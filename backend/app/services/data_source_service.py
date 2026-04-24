from datetime import datetime, timezone

from ..models.data_sources import DataSource, DataSourceVersion
from ..models.platform import SessionLocal, init_platform_db


def _utc_now():
    return datetime.now(timezone.utc)


def register_source(key, name, table_name, row_count):
    """
    Register or update source metadata in the central source registry.
    """
    normalized_key = str(key or "").strip().lower()
    table = str(table_name or normalized_key).strip() or normalized_key

    # Canonical reference source keys.
    if normalized_key in {"reference_groups", "ref_groups"} or str(table).strip().lower() == "ref_groups":
        normalized_key = "groups"
    elif normalized_key in {"reference_users", "ref_users"} or str(table).strip().lower() == "ref_users":
        normalized_key = "users"

    if not normalized_key:
        raise ValueError("key is required")

    display_name = str(name or normalized_key).strip() or normalized_key
    rows = max(0, int(row_count or 0))
    now = _utc_now()

    init_platform_db()
    session = SessionLocal()
    try:
        source = session.query(DataSource).filter_by(key=normalized_key).first()
        if source is None:
            source = session.query(DataSource).filter_by(name=normalized_key).first()

        if source is None:
            source = DataSource(
                key=normalized_key,
                name=normalized_key,
                display_name=display_name,
                table_name=table,
                row_count=rows,
                type="table",
                role=normalized_key,
                is_global=True,
                schema_version="v1",
                created_at=now,
                updated_at=now,
                last_updated=now,
            )
            session.add(source)
            session.flush()
        else:
            source.key = normalized_key
            source.name = source.name or normalized_key
            source.display_name = display_name
            source.table_name = table
            source.row_count = rows
            source.updated_at = now
            source.last_updated = now

        active_version = session.get(DataSourceVersion, int(source.active_version_id)) if source.active_version_id else None
        if active_version is not None:
            active_version.row_count = rows

        session.commit()
    finally:
        session.close()

    print(f"[SOURCE REGISTERED] {normalized_key} -> {rows} rows")

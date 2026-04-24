from __future__ import annotations

from .cache import get_cached, set_cache
from .normalizers import normalize as normalize_rows, read_rows
from ..data_source_service import register_source
from ...models.data_sources import DataSource, DataSourceVersion
from ...models.platform import SessionLocal, init_platform_db

try:
    import pandas as pd
except Exception:  # pragma: no cover - fallback keeps feature working without pandas
    pd = None


def load_file(path: str) -> list[dict]:
    lower_path = str(path or '').strip().lower()
    if lower_path.endswith(('.xlsx', '.xlsm', '.xltx', '.xltm')):
        return read_rows(path)

    if pd is not None:
        try:
            return pd.read_csv(path).to_dict(orient='records')
        except Exception:
            # Fall back to csv parser for compatibility with malformed files.
            return read_rows(path)
    return read_rows(path)


def get_source(name: str, normalized: bool = True) -> list[dict]:
    normalized_name = str(name or '').strip()
    if not normalized_name:
        return []

    raw_cache_key = f'{normalized_name}::raw'
    cached = get_cached(raw_cache_key)
    if cached:
        raw_data = cached.get('data') or []
        register_source(
            key=normalized_name,
            name=normalized_name.replace('_', ' ').title(),
            table_name=normalized_name,
            row_count=len(raw_data),
        )
        if not normalized:
            return raw_data

        init_platform_db()
        session = SessionLocal()
        try:
            source = session.query(DataSource).filter_by(name=normalized_name).first()
            role = getattr(source, 'role', None) if source is not None else None
        finally:
            session.close()
        return normalize_rows(role or normalized_name, raw_data)

    init_platform_db()
    session = SessionLocal()
    try:
        source = session.query(DataSource).filter_by(name=normalized_name).first()
        if not source or not source.active_version_id:
            return []

        version = session.get(DataSourceVersion, int(source.active_version_id))
        if version is None:
            return []

        raw_data = load_file(version.file_path)
        set_cache(raw_cache_key, raw_data)
        register_source(
            key=normalized_name,
            name=normalized_name.replace('_', ' ').title(),
            table_name=normalized_name,
            row_count=len(raw_data),
        )
        if not normalized:
            return raw_data

        return normalize_rows(source.role or normalized_name, raw_data)
    finally:
        session.close()

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone

from ..models.platform import FileMetadata, SessionLocal, init_platform_db
from ..utils.db_strings import truncate_with_log


LOGGER = logging.getLogger(__name__)


def _utc_now():
    return datetime.now(timezone.utc)


def _normalize_storage_path(storage_path: str) -> str:
    return os.path.abspath(str(storage_path or '').strip())


def _normalize_filename(filename: str) -> str:
    return os.path.basename(str(filename or '').strip())


def _detect_size(path: str) -> int | None:
    try:
        return int(os.path.getsize(path))
    except OSError:
        return None


def upsert_file_metadata(
    *,
    storage_path: str,
    original_filename: str,
    content_type: str | None = None,
    source_host: str | None = None,
    uploaded_by: str | None = None,
    status: str = 'stored',
):
    normalized_path = _normalize_storage_path(storage_path)
    if not normalized_path:
        return

    init_platform_db()
    session = SessionLocal()
    try:
        existing = session.query(FileMetadata).filter(FileMetadata.storage_path == normalized_path).one_or_none()
        now = _utc_now()
        if existing is None:
            existing = FileMetadata(
                storage_path=normalized_path,
                original_filename=truncate_with_log(
                    _normalize_filename(original_filename) or _normalize_filename(normalized_path),
                    max_length=255,
                    field_name='files.original_filename',
                    logger=LOGGER,
                ),
                content_type=truncate_with_log(
                    str(content_type or '').strip() or None,
                    max_length=255,
                    field_name='files.content_type',
                    logger=LOGGER,
                ),
                size_bytes=_detect_size(normalized_path),
                status=truncate_with_log(
                    str(status or 'stored').strip() or 'stored',
                    max_length=255,
                    field_name='files.status',
                    logger=LOGGER,
                ),
                source_host=truncate_with_log(
                    str(source_host or '').strip().lower() or None,
                    max_length=255,
                    field_name='files.source_host',
                    logger=LOGGER,
                ),
                uploaded_by=truncate_with_log(
                    str(uploaded_by or '').strip() or None,
                    max_length=120,
                    field_name='files.uploaded_by',
                    logger=LOGGER,
                ),
                created_at=now,
                updated_at=now,
            )
            session.add(existing)
        else:
            existing.original_filename = truncate_with_log(
                _normalize_filename(original_filename) or existing.original_filename,
                max_length=255,
                field_name='files.original_filename',
                logger=LOGGER,
            )
            existing.content_type = truncate_with_log(
                str(content_type or '').strip() or existing.content_type,
                max_length=255,
                field_name='files.content_type',
                logger=LOGGER,
            )
            existing.size_bytes = _detect_size(normalized_path)
            existing.status = truncate_with_log(
                str(status or existing.status).strip() or existing.status,
                max_length=255,
                field_name='files.status',
                logger=LOGGER,
            )
            existing.source_host = truncate_with_log(
                str(source_host or '').strip().lower() or existing.source_host,
                max_length=255,
                field_name='files.source_host',
                logger=LOGGER,
            )
            existing.uploaded_by = truncate_with_log(
                str(uploaded_by or '').strip() or existing.uploaded_by,
                max_length=120,
                field_name='files.uploaded_by',
                logger=LOGGER,
            )
            existing.updated_at = now

        session.commit()
    finally:
        session.close()


def move_file_metadata(old_storage_path: str, new_storage_path: str, *, original_filename: str | None = None):
    old_path = _normalize_storage_path(old_storage_path)
    new_path = _normalize_storage_path(new_storage_path)
    if not old_path or not new_path:
        return

    init_platform_db()
    session = SessionLocal()
    try:
        existing = session.query(FileMetadata).filter(FileMetadata.storage_path == old_path).one_or_none()
        if existing is None:
            upsert_file_metadata(
                storage_path=new_path,
                original_filename=original_filename or os.path.basename(new_path),
                status='stored',
            )
            return

        existing.storage_path = new_path
        if original_filename:
            existing.original_filename = truncate_with_log(
                _normalize_filename(original_filename),
                max_length=255,
                field_name='files.original_filename',
                logger=LOGGER,
            )
        existing.size_bytes = _detect_size(new_path)
        existing.updated_at = _utc_now()
        session.commit()
    finally:
        session.close()


def delete_file_metadata(storage_path: str):
    normalized_path = _normalize_storage_path(storage_path)
    if not normalized_path:
        return

    init_platform_db()
    session = SessionLocal()
    try:
        existing = session.query(FileMetadata).filter(FileMetadata.storage_path == normalized_path).one_or_none()
        if existing is None:
            return
        session.delete(existing)
        session.commit()
    finally:
        session.close()


def count_file_metadata() -> int:
    init_platform_db()
    session = SessionLocal()
    try:
        return int(session.query(FileMetadata).count())
    finally:
        session.close()


def get_file_metadata_by_path(storage_path: str):
    normalized_path = _normalize_storage_path(storage_path)
    if not normalized_path:
        return None

    init_platform_db()
    session = SessionLocal()
    try:
        row = session.query(FileMetadata).filter(FileMetadata.storage_path == normalized_path).one_or_none()
        if row is None:
            return None
        session.expunge(row)
        return row
    finally:
        session.close()


def get_file_metadata_by_id(file_id: int):
    try:
        normalized_id = int(file_id)
    except (TypeError, ValueError):
        return None

    if normalized_id <= 0:
        return None

    init_platform_db()
    session = SessionLocal()
    try:
        row = session.get(FileMetadata, normalized_id)
        if row is None:
            return None
        session.expunge(row)
        return row
    finally:
        session.close()

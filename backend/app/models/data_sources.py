from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .platform import Base


def _utc_now():
    return datetime.now(timezone.utc)


class DataSource(Base):
    __tablename__ = 'data_source'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    key: Mapped[str | None] = mapped_column(String(100), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    display_name: Mapped[str | None] = mapped_column(String(255))
    table_name: Mapped[str | None] = mapped_column(String(255))
    row_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    type: Mapped[str] = mapped_column(String(50), nullable=False, default='csv')
    role: Mapped[str | None] = mapped_column(String(50))
    is_global: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    schema_version: Mapped[str | None] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=_utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=_utc_now, onupdate=_utc_now)
    last_updated: Mapped[datetime | None] = mapped_column(DateTime)
    active_version_id: Mapped[int | None] = mapped_column(Integer, ForeignKey('data_source_version.id'))

    versions: Mapped[list['DataSourceVersion']] = relationship(
        'DataSourceVersion',
        foreign_keys='DataSourceVersion.source_id',
        back_populates='source',
        cascade='all, delete-orphan',
    )
    active_version: Mapped['DataSourceVersion | None'] = relationship(
        'DataSourceVersion',
        foreign_keys=[active_version_id],
        post_update=True,
    )


class DataSourceVersion(Base):
    __tablename__ = 'data_source_version'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_id: Mapped[int] = mapped_column(Integer, ForeignKey('data_source.id'), nullable=False, index=True)
    file_path: Mapped[str] = mapped_column(String(255), nullable=False)
    row_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=_utc_now)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    checksum: Mapped[str | None] = mapped_column(String(128))

    source: Mapped[DataSource] = relationship(
        'DataSource',
        foreign_keys=[source_id],
        back_populates='versions',
    )

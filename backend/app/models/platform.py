import os
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text, create_engine, inspect, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base, sessionmaker, mapped_column, Mapped


def _read_secret_file(path: str) -> str:
    secret_path = str(path or '').strip()
    if not secret_path:
        return ''
    try:
        with open(secret_path, 'r', encoding='utf-8') as handle:
            return handle.read().strip()
    except OSError:
        return ''


def resolve_database_url():
    configured = str(os.getenv('DATABASE_URL', '')).strip()
    if configured:
        return configured

    password_file = str(os.getenv('POSTGRES_PASSWORD_FILE', '/run/secrets/postgres_password')).strip()
    postgres_password = _read_secret_file(password_file)
    if not postgres_password:
        # Dev fallback when Docker secrets are not mounted.
        postgres_password = str(os.getenv('POSTGRES_PASSWORD', '')).strip()

    if postgres_password:
        postgres_user = str(os.getenv('POSTGRES_USER', 'westos')).strip() or 'westos'
        postgres_db = str(os.getenv('POSTGRES_DB', 'westos')).strip() or 'westos'
        postgres_host = str(os.getenv('POSTGRES_HOST', 'postgres')).strip() or 'postgres'
        postgres_port = str(os.getenv('POSTGRES_PORT', '5432')).strip() or '5432'
        return f'postgresql+psycopg://{postgres_user}:{postgres_password}@{postgres_host}:{postgres_port}/{postgres_db}'

    legacy_reference_url = str(os.getenv('REFERENCE_DATABASE_URL', '')).strip()
    if legacy_reference_url:
        return legacy_reference_url

    return 'sqlite:///reference.db'


DATABASE_URL = resolve_database_url()
engine = create_engine(DATABASE_URL, future=True, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False, future=True)
Base = declarative_base()


class PlatformUser(Base):
    __tablename__ = 'users'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(120), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(255), nullable=False, default='user')
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class UserProfile(Base):
    __tablename__ = 'user_profiles'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id'), nullable=False, unique=True, index=True)
    preferred_name: Mapped[str | None] = mapped_column(String(255))
    site_code: Mapped[str | None] = mapped_column(String(255))
    site_name: Mapped[str | None] = mapped_column(String(255))
    default_assignment_group: Mapped[str | None] = mapped_column(String(255))
    default_location: Mapped[str | None] = mapped_column(String(255))
    quick_links: Mapped[list] = mapped_column(JSON().with_variant(JSONB, 'postgresql'), nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class AuthLog(Base):
    __tablename__ = 'auth_logs'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(120), nullable=False, default='anonymous')
    host: Mapped[str] = mapped_column(String(255), nullable=False, default='')
    path: Mapped[str] = mapped_column(String(512), nullable=False, default='/')
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    reason: Mapped[str] = mapped_column(String(255), nullable=False, default='')
    detail: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))


class FileMetadata(Base):
    __tablename__ = 'files'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    storage_path: Mapped[str] = mapped_column(String(1024), nullable=False, unique=True, index=True)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str | None] = mapped_column(String(255))
    size_bytes: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(255), nullable=False, default='stored')
    source_host: Mapped[str | None] = mapped_column(String(255))
    uploaded_by: Mapped[str | None] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class AIInteraction(Base):
    __tablename__ = 'ai_interactions'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    interaction_type: Mapped[str] = mapped_column(String(255), nullable=False, default='chat')
    provider: Mapped[str] = mapped_column(String(255), nullable=False, default='ai-gateway')
    model: Mapped[str] = mapped_column(String(255), nullable=False, default='')
    prompt: Mapped[str] = mapped_column(Text, nullable=False, default='')
    response: Mapped[str] = mapped_column(Text, nullable=False, default='')
    status: Mapped[str] = mapped_column(String(255), nullable=False, default='ok')
    error: Mapped[str | None] = mapped_column(Text)
    input_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    source_host: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))


class FlowRun(Base):
    __tablename__ = 'flow_runs'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    flow_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey('users.id'), nullable=True, index=True)
    input_json: Mapped[str | None] = mapped_column(Text)
    output_json: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default='success', index=True)
    error_message: Mapped[str | None] = mapped_column(Text)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), index=True)


class FlowTemplate(Base):
    __tablename__ = 'flow_templates'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    script_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(255), nullable=False, default='General', index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False, default='')
    input_schema: Mapped[list] = mapped_column(JSON().with_variant(JSONB, 'postgresql'), nullable=False, default=list)
    endpoint: Mapped[str | None] = mapped_column(String(1024))
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class SoftwareRegistry(Base):
    __tablename__ = 'software_registry'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    vendor_name: Mapped[str] = mapped_column(String(255), nullable=False, default='')
    application_name: Mapped[str] = mapped_column(String(255), nullable=False, default='', index=True)
    business_function: Mapped[str | None] = mapped_column(Text)
    phi: Mapped[str | None] = mapped_column(String(32))
    corp_standard: Mapped[str | None] = mapped_column(String(32))
    baa: Mapped[str | None] = mapped_column(String(32))
    core_level: Mapped[str | None] = mapped_column(String(255))
    twilight: Mapped[str | None] = mapped_column(String(255))
    system_owner: Mapped[str | None] = mapped_column(String(255))
    hosting_provider: Mapped[str | None] = mapped_column(String(255))
    deployed_sites: Mapped[str | None] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    business_owner: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class DocumentRecord(Base):
    __tablename__ = 'documents'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    file_id: Mapped[int] = mapped_column(Integer, ForeignKey('files.id'), nullable=False, index=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(1024), nullable=False, unique=True, index=True)
    file_type: Mapped[str] = mapped_column(String(255), nullable=False, default='unknown')
    summary: Mapped[str] = mapped_column(Text, nullable=False, default='')
    tags: Mapped[list] = mapped_column(JSON().with_variant(JSONB, 'postgresql'), nullable=False, default=list)
    document_type: Mapped[str] = mapped_column(String(255), nullable=False, default='reference')
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    ai_processed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    processing_status: Mapped[str] = mapped_column(String(255), nullable=False, default='pending')
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


def init_platform_db():
    """Create base platform tables if they do not exist."""
    # Ensure additional model modules are imported before create_all.
    from . import data_sources  # noqa: F401

    Base.metadata.create_all(engine)
    _ensure_varchar_capacity()
    _ensure_data_source_schema()


_VARCHAR_MIGRATIONS: tuple[tuple[str, str, int], ...] = (
    ('users', 'role', 255),
    ('auth_logs', 'action', 255),
    ('auth_logs', 'reason', 255),
    ('files', 'status', 255),
    ('ai_interactions', 'interaction_type', 255),
    ('ai_interactions', 'provider', 255),
    ('ai_interactions', 'model', 255),
    ('ai_interactions', 'status', 255),
    ('documents', 'file_type', 255),
    ('documents', 'document_type', 255),
    ('documents', 'processing_status', 255),
    ('flow_templates', 'script_name', 255),
    ('flow_templates', 'display_name', 255),
    ('flow_templates', 'category', 255),
    ('flow_templates', 'endpoint', 1024),
    ('software_registry', 'vendor_name', 255),
    ('software_registry', 'application_name', 255),
    ('software_registry', 'phi', 32),
    ('software_registry', 'corp_standard', 32),
    ('software_registry', 'baa', 32),
    ('software_registry', 'core_level', 255),
    ('software_registry', 'twilight', 255),
    ('software_registry', 'system_owner', 255),
    ('software_registry', 'hosting_provider', 255),
    ('software_registry', 'business_owner', 255),
)


def _ensure_varchar_capacity():
    """Expand restrictive VARCHAR columns to avoid ingest failures on dynamic text."""
    inspector = inspect(engine)
    try:
        table_names = set(inspector.get_table_names())
    except Exception:
        return

    if engine.dialect.name != 'postgresql':
        # SQLite doesn't enforce VARCHAR length; no migration required.
        return

    with engine.begin() as connection:
        for table_name, column_name, target_length in _VARCHAR_MIGRATIONS:
            if table_name not in table_names:
                continue

            try:
                columns = {column['name']: column for column in inspector.get_columns(table_name)}
            except Exception:
                continue

            column = columns.get(column_name)
            if not column:
                continue

            current_type = column.get('type')
            current_length = getattr(current_type, 'length', None)
            if isinstance(current_length, int) and current_length >= target_length:
                continue

            connection.execute(
                text(
                    f'ALTER TABLE "{table_name}" ALTER COLUMN "{column_name}" TYPE VARCHAR({int(target_length)})'
                )
            )


def _ensure_data_source_schema():
    """Apply additive, non-destructive schema updates for data source tables."""
    inspector = inspect(engine)
    try:
        table_names = set(inspector.get_table_names())
    except Exception:
        return

    if 'data_source' not in table_names:
        return

    try:
        column_names = {column['name'] for column in inspector.get_columns('data_source')}
    except Exception:
        return

    def _execute_add_column(connection, statement_pg: str, statement_sqlite: str):
        if engine.dialect.name == 'postgresql':
            connection.execute(text(statement_pg))
        else:
            connection.execute(text(statement_sqlite))

    with engine.begin() as connection:
        if 'role' not in column_names:
            _execute_add_column(
                connection,
                'ALTER TABLE "data_source" ADD COLUMN "role" VARCHAR(50)',
                'ALTER TABLE data_source ADD COLUMN role VARCHAR(50)',
            )

        if 'key' not in column_names:
            _execute_add_column(
                connection,
                'ALTER TABLE "data_source" ADD COLUMN "key" VARCHAR(100)',
                'ALTER TABLE data_source ADD COLUMN "key" VARCHAR(100)',
            )
            if engine.dialect.name == 'postgresql':
                connection.execute(text('CREATE UNIQUE INDEX IF NOT EXISTS "ix_data_source_key" ON "data_source" ("key")'))
            else:
                connection.execute(text('CREATE UNIQUE INDEX IF NOT EXISTS ix_data_source_key ON data_source ("key")'))

        if 'display_name' not in column_names:
            _execute_add_column(
                connection,
                'ALTER TABLE "data_source" ADD COLUMN "display_name" VARCHAR(255)',
                'ALTER TABLE data_source ADD COLUMN display_name VARCHAR(255)',
            )

        if 'table_name' not in column_names:
            _execute_add_column(
                connection,
                'ALTER TABLE "data_source" ADD COLUMN "table_name" VARCHAR(255)',
                'ALTER TABLE data_source ADD COLUMN table_name VARCHAR(255)',
            )

        if 'row_count' not in column_names:
            _execute_add_column(
                connection,
                'ALTER TABLE "data_source" ADD COLUMN "row_count" INTEGER',
                'ALTER TABLE data_source ADD COLUMN row_count INTEGER',
            )

        if 'created_at' not in column_names:
            _execute_add_column(
                connection,
                'ALTER TABLE "data_source" ADD COLUMN "created_at" TIMESTAMP',
                'ALTER TABLE data_source ADD COLUMN created_at TIMESTAMP',
            )

        if 'updated_at' not in column_names:
            _execute_add_column(
                connection,
                'ALTER TABLE "data_source" ADD COLUMN "updated_at" TIMESTAMP',
                'ALTER TABLE data_source ADD COLUMN updated_at TIMESTAMP',
            )

        if engine.dialect.name == 'postgresql':
            connection.execute(text('UPDATE "data_source" SET "key" = COALESCE(NULLIF("key", \'\'), "name")'))
            connection.execute(text('UPDATE "data_source" SET "display_name" = COALESCE(NULLIF("display_name", \'\'), "name")'))
            connection.execute(text('UPDATE "data_source" SET "table_name" = COALESCE(NULLIF("table_name", \'\'), "name")'))
            connection.execute(text('UPDATE "data_source" SET "row_count" = COALESCE("row_count", 0)'))
            connection.execute(text('UPDATE "data_source" SET "created_at" = COALESCE("created_at", NOW())'))
            connection.execute(text('UPDATE "data_source" SET "updated_at" = COALESCE("updated_at", NOW())'))
        else:
            connection.execute(text('UPDATE data_source SET "key" = COALESCE(NULLIF("key", \'\'), name)'))
            connection.execute(text('UPDATE data_source SET display_name = COALESCE(NULLIF(display_name, \'\'), name)'))
            connection.execute(text('UPDATE data_source SET table_name = COALESCE(NULLIF(table_name, \'\'), name)'))
            connection.execute(text('UPDATE data_source SET row_count = COALESCE(row_count, 0)'))
            connection.execute(text('UPDATE data_source SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP)'))
            connection.execute(text('UPDATE data_source SET updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)'))

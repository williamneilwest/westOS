import os

from flask import current_app


def get_backend_data_dir() -> str:
    base_dir = current_app.config.get("BACKEND_DATA_DIR", "/app/data")
    os.makedirs(base_dir, exist_ok=True)
    return base_dir


def get_uploads_dir() -> str:
    uploads_dir = os.path.join(get_backend_data_dir(), "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    return uploads_dir


def get_kb_dir() -> str:
    kb_dir = os.path.join(get_backend_data_dir(), "work", "kb")
    os.makedirs(kb_dir, exist_ok=True)
    return kb_dir


def get_legacy_kb_dir() -> str:
    return os.path.join(get_backend_data_dir(), "kb")


def get_processed_kb_dir() -> str:
    processed_dir = os.path.join(get_kb_dir(), "processed")
    os.makedirs(processed_dir, exist_ok=True)
    return processed_dir


def get_kb_category_dir(category: str) -> str:
    cat = (category or "").strip().lower() or "uncategorized"
    category_dir = os.path.join(get_kb_dir(), cat)
    os.makedirs(category_dir, exist_ok=True)
    return category_dir

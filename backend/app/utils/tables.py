import json
import os

from flask import current_app


def get_tables_dir():
    base_dir = current_app.config.get("BACKEND_DATA_DIR", "/app/data")
    tables_dir = os.path.join(base_dir, "tables")
    os.makedirs(tables_dir, exist_ok=True)
    return tables_dir


def get_table_path(table_name):
    return os.path.join(get_tables_dir(), f"{table_name}.json")


def read_table(table_name):
    path = get_table_path(table_name)
    if not os.path.exists(path):
        return []

    with open(path, "r", encoding="utf-8") as handle:
        data = json.load(handle)

    return data if isinstance(data, list) else []


def write_table(table_name, data):
    path = get_table_path(table_name)
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2)


def append_table(table_name, record):
    data = read_table(table_name)
    data.append(record)
    write_table(table_name, data)


# Safe usage example:
# append_table("ai_documents", {
#     "id": "doc_123",
#     "filename": "example.pdf",
#     "tags": ["network", "vpn"],
#     "created_at": "2026-04-12"
# })

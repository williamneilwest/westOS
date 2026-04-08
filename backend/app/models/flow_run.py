from datetime import datetime
import json
from uuid import uuid4

from ..db import db


class FlowRun(db.Model):
    __tablename__ = 'flow_runs'

    id = db.Column(db.String(64), primary_key=True, default=lambda: str(uuid4()))
    user_id = db.Column(db.String(64), nullable=False, index=True)
    file_name = db.Column(db.String(255), nullable=False)
    row_count = db.Column(db.Integer, nullable=False, default=0)
    column_count = db.Column(db.Integer, nullable=False, default=0)
    status = db.Column(db.String(20), nullable=False, default='Failed')
    error_message = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    processed_file_path = db.Column(db.Text, nullable=True)
    raw_preview_json = db.Column(db.Text, nullable=True)
    processing_time_ms = db.Column(db.Integer, nullable=True)

    def get_preview(self) -> list[dict[str, object]]:
        try:
            payload = json.loads(self.raw_preview_json or '[]')
        except json.JSONDecodeError:
            return []
        if isinstance(payload, list):
            return [row for row in payload if isinstance(row, dict)]
        return []

    def to_dict(self, include_preview: bool = False) -> dict[str, object]:
        data: dict[str, object] = {
            'id': self.id,
            'user_id': self.user_id,
            'file_name': self.file_name,
            'row_count': self.row_count,
            'column_count': self.column_count,
            'status': self.status,
            'error_message': self.error_message,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'processed_file_path': self.processed_file_path,
            'processing_time_ms': self.processing_time_ms,
        }
        if include_preview:
            data['preview'] = self.get_preview()
        return data

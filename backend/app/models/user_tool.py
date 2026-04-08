from datetime import datetime
from uuid import uuid4
import json

from ..db import db


class UserTool(db.Model):
    __tablename__ = 'tool_modules'

    id = db.Column(db.String(64), primary_key=True, default=lambda: str(uuid4()))
    name = db.Column(db.String(255), nullable=False)
    type = db.Column(db.String(80), nullable=False)
    config_json = db.Column(db.Text, nullable=False, default='{}')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, onupdate=datetime.utcnow)

    def config(self) -> dict[str, object]:
        try:
            raw = json.loads(self.config_json or '{}')
        except Exception:
            return {}
        return raw if isinstance(raw, dict) else {}

    def to_dict(self) -> dict[str, object]:
        return {
            'id': self.id,
            'name': self.name,
            'type': self.type,
            'config': self.config(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

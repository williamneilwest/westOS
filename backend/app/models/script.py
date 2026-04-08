from datetime import datetime
from uuid import uuid4

from ..db import db


class Script(db.Model):
    __tablename__ = 'scripts'

    id = db.Column(db.String(64), primary_key=True, default=lambda: str(uuid4()))
    user_id = db.Column(db.String(64), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False, default='')
    script = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, onupdate=datetime.utcnow)

    def to_dict(self) -> dict[str, object]:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'description': self.description,
            'script': self.script,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

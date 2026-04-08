from datetime import datetime
from uuid import uuid4

from sqlalchemy import JSON

from ..db import db


class Project(db.Model):
    __tablename__ = 'projects'

    id = db.Column(db.String(64), primary_key=True, default=lambda: str(uuid4()))
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False, default='')
    type = db.Column(db.String(20), nullable=False, default='custom')
    status = db.Column(db.String(40), nullable=False, default='Backlog')
    notes = db.Column(db.Text, nullable=False, default='')
    link = db.Column(db.Text, nullable=True)
    tags = db.Column(JSON, nullable=False, default=list)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self) -> dict[str, object]:
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description or '',
            'type': self.type or 'custom',
            'status': self.status,
            'notes': self.notes,
            'link': self.link,
            'tags': self.tags or [],
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
        }

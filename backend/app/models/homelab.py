from datetime import datetime
from uuid import uuid4

from ..db import db


class HomelabService(db.Model):
    __tablename__ = 'homelab_services'

    id = db.Column(db.String(64), primary_key=True, default=lambda: str(uuid4()))
    name = db.Column(db.String(200), nullable=False)
    endpoint = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), nullable=False, default='healthy')
    uptime_days = db.Column(db.Integer, nullable=False, default=0)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self) -> dict[str, object]:
        return {
            'id': self.id,
            'name': self.name,
            'endpoint': self.endpoint,
            'status': self.status,
            'uptimeDays': self.uptime_days,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
        }

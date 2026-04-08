from datetime import date, datetime
from uuid import uuid4

from ..db import db


class PlanningItem(db.Model):
    __tablename__ = 'planning_items'

    id = db.Column(db.String(64), primary_key=True, default=lambda: str(uuid4()))
    title = db.Column(db.String(200), nullable=False)
    scenario = db.Column(db.String(120), nullable=False, default='General')
    notes = db.Column(db.Text, nullable=False, default='')
    cadence = db.Column(db.String(20), nullable=False, default='weekly')
    target_date = db.Column(db.Date, nullable=False, default=date.today)
    progress = db.Column(db.Integer, nullable=False, default=0)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self) -> dict[str, object]:
        return {
            'id': self.id,
            'title': self.title,
            'scenario': self.scenario,
            'notes': self.notes,
            'cadence': self.cadence,
            'targetDate': self.target_date.isoformat() if isinstance(self.target_date, date) else None,
            'progress': self.progress,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
        }

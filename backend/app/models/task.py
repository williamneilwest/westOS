from datetime import date, datetime

from sqlalchemy import JSON

from ..db import db


class Task(db.Model):
    __tablename__ = 'tasks'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False, default='')
    details = db.Column(db.Text, nullable=False, default='')
    completed = db.Column(db.Boolean, default=False)
    due_date = db.Column(db.Date, nullable=True)
    priority = db.Column(db.String(20), nullable=False, default='medium')
    status = db.Column(db.String(20), nullable=False, default='todo')
    category = db.Column(db.String(50), nullable=False, default='General')
    depends_on = db.Column(JSON, nullable=False, default=list)
    auto_complete_rule = db.Column(db.Text, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    project_id = db.Column(db.String(64), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self) -> dict[str, object]:
        return {
            'id': str(self.id),
            'title': self.title,
            'description': self.description or '',
            'details': self.details or '',
            'completed': self.completed,
            'dueDate': self.due_date.isoformat() if isinstance(self.due_date, date) else None,
            'priority': self.priority,
            'status': self.status,
            'category': self.category or 'General',
            'dependsOn': self.depends_on or [],
            'autoCompleteRule': self.auto_complete_rule,
            'notes': self.notes,
            'projectId': self.project_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

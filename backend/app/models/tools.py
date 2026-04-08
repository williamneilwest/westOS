from datetime import datetime
from uuid import uuid4

from ..db import db


class ToolLink(db.Model):
    __tablename__ = 'tool_links'

    id = db.Column(db.String(64), primary_key=True, default=lambda: str(uuid4()))
    name = db.Column(db.String(200), nullable=False)
    url = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(100), nullable=False, default='General')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self) -> dict[str, object]:
        return {
            'id': self.id,
            'name': self.name,
            'url': self.url,
            'category': self.category,
        }


class CommandSnippet(db.Model):
    __tablename__ = 'command_snippets'

    id = db.Column(db.String(64), primary_key=True, default=lambda: str(uuid4()))
    title = db.Column(db.String(200), nullable=False)
    command = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self) -> dict[str, object]:
        return {
            'id': self.id,
            'title': self.title,
            'command': self.command,
        }

from datetime import datetime

from ..db import db


class QuickLink(db.Model):
    __tablename__ = 'quick_links'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(64), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    url = db.Column(db.String(2048), nullable=False)
    category = db.Column(db.String(100), nullable=True)
    icon = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self) -> dict[str, object]:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'url': self.url,
            'category': self.category,
            'icon': self.icon,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

from datetime import datetime
from uuid import uuid4

from werkzeug.security import check_password_hash, generate_password_hash

from ..db import db


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.String(64), primary_key=True, default=lambda: str(uuid4()))
    username = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def set_password(self, raw_password: str) -> None:
        self.password_hash = generate_password_hash(raw_password)

    def check_password(self, raw_password: str) -> bool:
        return check_password_hash(self.password_hash, raw_password)

    def to_dict(self) -> dict[str, object]:
        return {
            'id': self.id,
            'username': self.username,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

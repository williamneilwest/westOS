from datetime import datetime

from sqlalchemy.ext.mutable import MutableList

from ..db import db


class PlaidRuntimeState(db.Model):
    __tablename__ = 'plaid_runtime_states'

    user_id = db.Column(db.String(64), db.ForeignKey('users.id'), primary_key=True)
    access_token = db.Column(db.Text, nullable=True)
    sync_cursor = db.Column(db.Text, nullable=True)
    transactions_cache = db.Column(MutableList.as_mutable(db.JSON), nullable=False, default=list)
    accounts_cache = db.Column(MutableList.as_mutable(db.JSON), nullable=False, default=list)
    last_manual_refresh_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

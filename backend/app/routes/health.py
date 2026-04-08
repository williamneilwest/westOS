from flask import Blueprint
from sqlalchemy import text

from ..api_response import success_response
from ..db import db

health_bp = Blueprint('health', __name__)


@health_bp.get('/health')
def healthcheck():
    db_status = 'connected'
    try:
        db.session.execute(text('SELECT 1'))
    except Exception:
        db_status = 'disconnected'
    return success_response({'status': 'ok', 'db': db_status})

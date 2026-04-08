from flask import Blueprint, current_app, request

from ..api_response import error_response, success_response
from ..db import db
from ..models import HomelabService


homelab_bp = Blueprint('homelab', __name__)


@homelab_bp.get('/homelab/', strict_slashes=False)
def get_homelab_services():
    current_app.logger.info('[DB] Fetching table: homelab_services')
    services = HomelabService.query.order_by(HomelabService.updated_at.desc()).all()
    return success_response({'data': [service.to_dict() for service in services]})


@homelab_bp.post('/homelab/', strict_slashes=False)
def create_homelab_service():
    data = request.get_json(silent=True) or {}
    name = str(data.get('name', '')).strip()
    endpoint = str(data.get('endpoint', '')).strip()

    if not name or not endpoint:
        return error_response('name and endpoint are required', 400)

    service = HomelabService(
        id=str(data.get('id') or '').strip() or None,
        name=name,
        endpoint=endpoint,
        status=str(data.get('status') or 'healthy'),
        uptime_days=int(data.get('uptimeDays', 0)),
    )

    db.session.add(service)
    db.session.commit()
    return success_response(service.to_dict(), 201)


@homelab_bp.patch('/homelab/<string:service_id>', strict_slashes=False)
def update_homelab_service(service_id: str):
    data = request.get_json(silent=True) or {}
    service = HomelabService.query.get_or_404(service_id)

    if 'status' in data:
        service.status = str(data.get('status') or service.status)
    if 'uptimeDays' in data:
        service.uptime_days = int(data.get('uptimeDays', service.uptime_days))

    db.session.commit()
    return success_response(service.to_dict())

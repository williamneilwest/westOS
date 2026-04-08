from datetime import UTC, date, datetime

from flask import Blueprint, current_app, request

from ..api_response import error_response, success_response
from ..db import db
from ..models import PlanningItem


planning_bp = Blueprint('planning', __name__)


def _parse_date(value: str | None) -> date:
    if value:
        try:
            return date.fromisoformat(value)
        except ValueError:
            return date.today()
    return date.today()


def _planning_last_updated() -> str:
    last = db.session.query(db.func.max(PlanningItem.updated_at)).scalar()
    if isinstance(last, datetime):
        return last.replace(tzinfo=UTC).isoformat()
    return datetime.now(UTC).isoformat()


@planning_bp.get('/planning/', strict_slashes=False)
def get_planning():
    current_app.logger.info('[DB] Fetching table: planning_items')
    items = PlanningItem.query.order_by(PlanningItem.updated_at.desc()).all()
    current_app.logger.info('[DB] planning_items rows returned: %s', len(items))
    return success_response({'data': [item.to_dict() for item in items], 'lastUpdated': _planning_last_updated()})


@planning_bp.get('/planning/last-updated', strict_slashes=False)
def get_planning_last_updated():
    return success_response({'lastUpdated': _planning_last_updated()})


@planning_bp.get('/planning/<string:item_id>', strict_slashes=False)
def get_planning_item(item_id: str):
    item = PlanningItem.query.get_or_404(item_id)
    return success_response(item.to_dict())


@planning_bp.post('/planning/', strict_slashes=False)
def create_planning_item():
    data = request.get_json(silent=True) or {}
    title = str(data.get('title', '')).strip()

    if not title:
        return error_response('title is required', 400)

    item = PlanningItem(
        id=str(data.get('id') or '').strip() or None,
        title=title,
        scenario=str(data.get('scenario') or 'General').strip() or 'General',
        notes=str(data.get('notes') or ''),
        cadence=str(data.get('cadence') or 'weekly'),
        target_date=_parse_date(data.get('targetDate')),
        progress=int(data.get('progress', 0)),
    )

    db.session.add(item)
    db.session.commit()

    return success_response(item.to_dict(), 201)


@planning_bp.patch('/planning/<string:item_id>', strict_slashes=False)
def update_planning_item(item_id: str):
    data = request.get_json(silent=True) or {}
    item = PlanningItem.query.get_or_404(item_id)

    if 'title' in data:
        title = str(data.get('title') or '').strip()
        if not title:
            return error_response('title cannot be empty', 400)
        item.title = title

    if 'scenario' in data:
        item.scenario = str(data.get('scenario') or 'General').strip() or 'General'
    if 'notes' in data:
        item.notes = str(data.get('notes') or '')
    if 'cadence' in data:
        item.cadence = str(data.get('cadence') or item.cadence)
    if 'targetDate' in data:
        item.target_date = _parse_date(data.get('targetDate'))
    if 'progress' in data:
        item.progress = int(data.get('progress', item.progress))

    db.session.commit()
    return success_response(item.to_dict())


@planning_bp.delete('/planning/<string:item_id>', strict_slashes=False)
def delete_planning_item(item_id: str):
    item = PlanningItem.query.get_or_404(item_id)
    db.session.delete(item)
    db.session.commit()
    return success_response({'deleted': True})

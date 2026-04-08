from datetime import UTC, date, datetime

from flask import Blueprint, current_app, request

from ..api_response import error_response, success_response
from ..db import db
from ..models import Task


tasks_bp = Blueprint('tasks', __name__)


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def _tasks_last_updated() -> str:
    last = db.session.query(db.func.max(Task.updated_at)).scalar()
    if isinstance(last, datetime):
        return last.replace(tzinfo=UTC).isoformat()
    return datetime.now(UTC).isoformat()


@tasks_bp.get('/tasks/', strict_slashes=False)
def get_tasks():
    current_app.logger.info('[DB] Fetching table: tasks')
    tasks = Task.query.order_by(Task.updated_at.desc(), Task.created_at.desc()).all()
    current_app.logger.info('[DB] tasks rows returned: %s', len(tasks))
    return success_response({'data': [task.to_dict() for task in tasks], 'lastUpdated': _tasks_last_updated()})


@tasks_bp.get('/tasks/last-updated', strict_slashes=False)
def get_tasks_last_updated():
    return success_response({'lastUpdated': _tasks_last_updated()})


@tasks_bp.get('/tasks/<int:task_id>', strict_slashes=False)
def get_task(task_id: int):
    task = Task.query.get_or_404(task_id)
    return success_response(task.to_dict())


@tasks_bp.post('/tasks/', strict_slashes=False)
def create_task():
    data = request.get_json(silent=True) or {}
    title = str(data.get('title', '')).strip()

    if not title:
        return error_response('title is required', 400)

    task = Task(
        title=title,
        description=str(data.get('description') or ''),
        details=str(data.get('details') or ''),
        completed=bool(data.get('completed', False)),
        due_date=_parse_date(data.get('dueDate')),
        priority=str(data.get('priority') or 'medium'),
        status=str(data.get('status') or 'todo'),
        category=str(data.get('category') or 'General'),
        depends_on=list(data.get('dependsOn') or []),
        auto_complete_rule=(str(data.get('autoCompleteRule')).strip() if data.get('autoCompleteRule') else None),
        notes=(str(data.get('notes')).strip() if data.get('notes') is not None else None),
        project_id=(str(data.get('projectId')).strip() if data.get('projectId') else None),
    )

    db.session.add(task)
    db.session.commit()

    return success_response(task.to_dict(), 201)


@tasks_bp.patch('/tasks/<int:task_id>', strict_slashes=False)
def update_task(task_id: int):
    data = request.get_json(silent=True) or {}
    task = Task.query.get_or_404(task_id)

    if 'title' in data:
        title = str(data['title']).strip()
        if not title:
            return error_response('title cannot be empty', 400)
        task.title = title

    if 'completed' in data:
        task.completed = bool(data['completed'])
    if 'description' in data:
        task.description = str(data.get('description') or '')
    if 'details' in data:
        task.details = str(data.get('details') or '')
    if 'dueDate' in data:
        task.due_date = _parse_date(data.get('dueDate'))
    if 'priority' in data:
        task.priority = str(data.get('priority') or task.priority)
    if 'status' in data:
        task.status = str(data.get('status') or task.status)
    if 'category' in data:
        task.category = str(data.get('category') or 'General')
    if 'dependsOn' in data:
        task.depends_on = list(data.get('dependsOn') or [])
    if 'autoCompleteRule' in data:
        task.auto_complete_rule = str(data.get('autoCompleteRule')).strip() if data.get('autoCompleteRule') else None
    if 'notes' in data:
        task.notes = str(data['notes']) if data['notes'] is not None else None
    if 'projectId' in data:
        task.project_id = str(data['projectId']) if data['projectId'] else None

    db.session.commit()
    return success_response(task.to_dict())


@tasks_bp.delete('/tasks/<int:task_id>', strict_slashes=False)
def delete_task(task_id: int):
    task = Task.query.get_or_404(task_id)
    db.session.delete(task)
    db.session.commit()
    return success_response({'deleted': True})

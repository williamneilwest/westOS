from flask import Blueprint, current_app
from ..api_response import success_response
from ..models import PlanningItem, Project, Task


dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.get('/dashboard-summary', strict_slashes=False)
def get_dashboard_summary():
    current_app.logger.info('[DB] Fetching dashboard summary')

    tasks = Task.query.count()
    pending_tasks = Task.query.filter(Task.status != 'done').count()
    projects = Project.query.count()
    planning_count = PlanningItem.query.count()

    total_balance = 0.0
    current_app.logger.info(
        '[DB] Dashboard summary rows: tasks=%s, projects=%s, planning_items=%s',
        tasks,
        projects,
        planning_count,
    )

    return success_response(
        {
            'total_tasks': tasks,
            'pending_tasks': pending_tasks,
            'total_projects': projects,
            'total_balance': total_balance,
            'planning_count': planning_count,
        }
    )

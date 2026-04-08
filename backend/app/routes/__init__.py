from flask import Blueprint

from .auth import auth_bp
from .dashboard import dashboard_bp
from .db_viewer import db_viewer_bp
from .flows import flows_bp
from .health import health_bp
from .home_planning import home_planning_bp
from .homelab import homelab_bp
from .planning import planning_bp
from .projects import projects_bp
from .plaid_routes import plaid_routes_bp
from .quick_links import quick_links_bp
from .scripts import scripts_bp
from .services import services_bp
from .tasks import tasks_bp
from .transaction_routes import transaction_routes_bp
from .tools import tools_bp
from .workplace import workplace_bp

api_bp = Blueprint('api', __name__, url_prefix='/api')
api_bp.register_blueprint(auth_bp)
api_bp.register_blueprint(health_bp)
api_bp.register_blueprint(db_viewer_bp)
api_bp.register_blueprint(dashboard_bp)
api_bp.register_blueprint(services_bp)
api_bp.register_blueprint(projects_bp)
api_bp.register_blueprint(plaid_routes_bp)
api_bp.register_blueprint(quick_links_bp)
api_bp.register_blueprint(scripts_bp)
api_bp.register_blueprint(tasks_bp)
api_bp.register_blueprint(transaction_routes_bp)
api_bp.register_blueprint(flows_bp)
api_bp.register_blueprint(planning_bp)
api_bp.register_blueprint(homelab_bp)
api_bp.register_blueprint(home_planning_bp)
api_bp.register_blueprint(tools_bp)
api_bp.register_blueprint(workplace_bp)

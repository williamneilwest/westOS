from flask import Blueprint, current_app, jsonify

from ..services.status import build_health_payload

health_bp = Blueprint('health', __name__)


@health_bp.get('/ai/health')
@health_bp.get('/api/ai/health')
@health_bp.get('/health')
def health():
    return jsonify(
        build_health_payload(
            app_name=current_app.config['APP_NAME'],
            model=current_app.config['LITELLM_MODEL'],
            api_base=current_app.config['OLLAMA_API_BASE'],
        )
    )

from flask import Blueprint, current_app, jsonify

from ..services.status import build_health_payload

health_bp = Blueprint('health', __name__)


@health_bp.get('/')
def root_health():
    return jsonify({'status': 'AI Gateway Running'})


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


@health_bp.get('/v1/models')
def models():
    model_id = str(current_app.config.get('LITELLM_MODEL') or '').strip() or 'unconfigured'
    return jsonify(
        {
            'object': 'list',
            'data': [
                {
                    'id': model_id,
                    'object': 'model',
                    'owned_by': 'ai-gateway',
                }
            ],
        }
    )

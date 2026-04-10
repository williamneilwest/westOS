from requests import RequestException
from flask import Blueprint, current_app, jsonify, request

from ..services.ai_client import (
    build_compat_chat_response,
    build_health_payload,
    build_openai_chat_response,
    call_gateway_chat,
    call_gateway_openai_chat,
    call_ollama_generate,
)


ai_bp = Blueprint('ai', __name__)


def _using_gateway():
    return bool(current_app.config.get('USE_AI_GATEWAY'))


@ai_bp.post('/ai/chat')
@ai_bp.post('/api/ai/chat')
@ai_bp.post('/chat')
def chat():
    payload = request.get_json(silent=True) or {}

    try:
        if _using_gateway():
            return jsonify(call_gateway_chat(payload, current_app.config['AI_GATEWAY_BASE_URL']))

        result = call_ollama_generate(
            payload=payload,
            ollama_api_base=current_app.config['OLLAMA_API_BASE'],
            ollama_model=current_app.config['OLLAMA_MODEL'],
        )
        return jsonify(build_compat_chat_response(payload, result))
    except ValueError as error:
        return jsonify({'error': str(error)}), 400
    except RequestException as error:
        return jsonify({'error': f'AI request failed: {error}'}), 503


@ai_bp.post('/ai/v1/chat/completions')
@ai_bp.post('/api/ai/v1/chat/completions')
@ai_bp.post('/v1/chat/completions')
def openai_chat():
    payload = request.get_json(silent=True) or {}

    try:
        if _using_gateway():
            return jsonify(call_gateway_openai_chat(payload, current_app.config['AI_GATEWAY_BASE_URL']))

        result = call_ollama_generate(
            payload=payload,
            ollama_api_base=current_app.config['OLLAMA_API_BASE'],
            ollama_model=current_app.config['OLLAMA_MODEL'],
        )
        return jsonify(build_openai_chat_response(result, current_app.config['OLLAMA_MODEL']))
    except ValueError as error:
        return jsonify({'error': {'message': str(error), 'type': 'invalid_request_error'}}), 400
    except RequestException as error:
        return jsonify({'error': {'message': f'AI request failed: {error}', 'type': 'service_unavailable'}}), 503


@ai_bp.get('/ai/health')
@ai_bp.get('/api/ai/health')
def health():
    api_base = current_app.config['AI_GATEWAY_BASE_URL'] if _using_gateway() else current_app.config['OLLAMA_API_BASE']
    model = current_app.config['LITELLM_MODEL'] if _using_gateway() else current_app.config['OLLAMA_MODEL']

    return jsonify(
        build_health_payload(
            app_name=current_app.config['APP_NAME'],
            model=model,
            api_base=api_base,
            use_ai_gateway=_using_gateway(),
        )
    )

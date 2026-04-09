def build_health_payload(app_name, model, api_base):
    return {
        'name': app_name,
        'service': 'ai-gateway',
        'status': 'ok',
        'provider': 'litellm',
        'model': model or 'unconfigured',
        'apiBase': api_base,
    }

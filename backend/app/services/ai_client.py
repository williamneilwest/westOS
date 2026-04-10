import requests


DEFAULT_TIMEOUT_SECONDS = 120


def extract_message_content(message):
    content = message.get('content', '')

    if isinstance(content, str):
        return content

    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, dict) and item.get('type') == 'text':
                parts.append(item.get('text', ''))
        return '\n'.join(part for part in parts if part)

    return ''


def normalize_messages(payload):
    if isinstance(payload.get('messages'), list) and payload['messages']:
        return payload['messages']

    prompt = str(payload.get('message', '')).strip()
    if not prompt:
        raise ValueError('A prompt is required.')

    return [{'role': 'user', 'content': prompt}]


def build_prompt(payload):
    messages = normalize_messages(payload)

    if len(messages) == 1:
        return extract_message_content(messages[0]).strip()

    parts = []
    for message in messages:
        content = extract_message_content(message).strip()
        if not content:
            continue
        role = str(message.get('role', 'user')).strip() or 'user'
        parts.append(f'{role}: {content}')

    prompt = '\n\n'.join(parts).strip()
    if not prompt:
        raise ValueError('A prompt is required.')

    return prompt


def call_gateway_chat(payload, gateway_base_url):
    response = requests.post(
        f"{gateway_base_url.rstrip('/')}/api/ai/chat",
        json=payload,
        timeout=DEFAULT_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    return response.json()


def call_gateway_openai_chat(payload, gateway_base_url):
    response = requests.post(
        f"{gateway_base_url.rstrip('/')}/api/ai/v1/chat/completions",
        json=payload,
        timeout=DEFAULT_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    return response.json()


def call_ollama_generate(payload, ollama_api_base, ollama_model):
    prompt = build_prompt(payload)
    response = requests.post(
        f"{ollama_api_base.rstrip('/')}/api/generate",
        json={
            'model': ollama_model,
            'prompt': prompt,
            'stream': False,
        },
        timeout=DEFAULT_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    return response.json()


def build_compat_chat_response(payload, result):
    return {
        'status': 'ok',
        'message': result.get('response', ''),
        'model': result.get('model'),
        'received': payload,
        'usage': result.get('usage'),
    }


def build_openai_chat_response(result, ollama_model):
    content = result.get('response', '')

    return {
        'id': result.get('created_at') or 'ollama-chat-completion',
        'object': 'chat.completion',
        'created': 0,
        'model': result.get('model') or ollama_model,
        'choices': [
            {
                'index': 0,
                'message': {
                    'role': 'assistant',
                    'content': content,
                },
                'finish_reason': 'stop',
            }
        ],
        'usage': result.get('usage'),
    }


def build_health_payload(app_name, model, api_base, use_ai_gateway):
    return {
        'name': app_name,
        'service': 'backend-ai',
        'status': 'ok',
        'provider': 'ai-gateway' if use_ai_gateway else 'ollama',
        'model': model or 'unconfigured',
        'apiBase': api_base,
    }

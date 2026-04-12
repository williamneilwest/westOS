import logging
import os
from time import perf_counter

from litellm import completion


LOGGER = logging.getLogger(__name__)


def _resolve_model(model, api_base):
    normalized = str(model or '').strip()
    if not normalized:
        return normalized

    if normalized == 'mistral' or normalized.startswith('ollama/'):
        raise RuntimeError('Ollama is disabled. Configure an OpenAI model instead.')

    if normalized.startswith('openai/'):
        return normalized

    # Normalize bare model ids (e.g. "gpt-4o") to explicit OpenAI provider format.
    return f'openai/{normalized}'


def _uses_ollama(model, api_base):
    return False


def _extract_message_content(message):
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


def _normalize_messages(payload):
    if isinstance(payload.get('messages'), list) and payload['messages']:
        return payload['messages']

    prompt = str(payload.get('message', '')).strip()
    if not prompt:
        raise ValueError('A prompt is required.')

    return [{'role': 'user', 'content': prompt}]


def clean_ai_output(text):
    cleaned = str(text or '').strip()

    if cleaned.startswith('```'):
        cleaned = cleaned.strip()
        if cleaned.startswith('```json'):
            cleaned = cleaned[len('```json') :].strip()
        elif cleaned.startswith('```'):
            cleaned = cleaned[3:].strip()

        if cleaned.endswith('```'):
            cleaned = cleaned[:-3].strip()

    return cleaned


def run_chat_completion(payload, model, temperature, max_tokens, api_base):
    resolved_model = _resolve_model(model, api_base)
    if not resolved_model:
        raise RuntimeError('LiteLLM model is not configured. Set LITELLM_MODEL in the environment.')

    messages = _normalize_messages(payload)
    try:
        request_temperature = float(payload.get('temperature', temperature))
    except (TypeError, ValueError):
        request_temperature = float(temperature)

    request_max_tokens = int(payload.get('max_tokens', max_tokens))

    request_kwargs = {
        'model': resolved_model,
        'messages': messages,
        'temperature': request_temperature,
        'max_tokens': request_max_tokens,
        'stream': False,
    }

    if _uses_ollama(resolved_model, api_base):
        request_kwargs['api_base'] = api_base
        request_kwargs['extra_body'] = {
            'keep_alive': -1,
            'options': {
                # Align Ollama generation limit with request_max_tokens
                'num_predict': request_max_tokens,
                'num_ctx': 2048,
                'temperature': request_temperature,
            },
        }

    started_at = perf_counter()
    LOGGER.info('Starting AI request for model %s', resolved_model)

    try:
        response = completion(**request_kwargs)
    except Exception as error:
        LOGGER.info('AI request failed for model %s in %.2fs', resolved_model, perf_counter() - started_at)
        if _uses_ollama(resolved_model, api_base):
            raise RuntimeError(
                'LiteLLM could not reach Ollama. Verify OLLAMA_API_BASE and that the Ollama server is running.'
            ) from error
        raise RuntimeError(f'LiteLLM request failed: {error}') from error

    LOGGER.info('AI request finished for model %s in %.2fs', resolved_model, perf_counter() - started_at)

    return response.model_dump() if hasattr(response, 'model_dump') else response


def warmup_chat_completion(model, temperature, api_base):
    resolved_model = _resolve_model(model, api_base)
    if not resolved_model:
        return

    request_kwargs = {
        'model': resolved_model,
        'messages': [{'role': 'user', 'content': 'warmup'}],
        'temperature': float(temperature),
        'max_tokens': 1,
        'stream': False,
    }

    if _uses_ollama(resolved_model, api_base):
        request_kwargs['api_base'] = api_base
        request_kwargs['extra_body'] = {
            'keep_alive': -1,
            'options': {
                'num_predict': 100,
                'num_ctx': 1024,
                'temperature': float(temperature),
            },
        }

    completion(**request_kwargs)


def build_compat_chat_response(payload, result):
    choices = result.get('choices') or []
    first_choice = choices[0] if choices else {}
    message = first_choice.get('message') or {}
    content = clean_ai_output(_extract_message_content(message))

    return {
        'status': 'ok',
        'message': content,
        'model': result.get('model'),
        'received': payload,
        'usage': result.get('usage'),
    }


def build_openai_chat_response(result):
    return result

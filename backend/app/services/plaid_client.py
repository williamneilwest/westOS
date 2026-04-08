from __future__ import annotations

from typing import Any

import requests
from flask import current_app

from .plaid_config import get_plaid_config


class PlaidRequestError(Exception):
    def __init__(self, message: str, status_code: int = 400, request_id: str | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.request_id = request_id


def plaid_post(endpoint: str, data: dict[str, Any]) -> dict[str, Any]:
    config = get_plaid_config()
    path = endpoint if endpoint.startswith('/') else f'/{endpoint}'
    url = f'{config.base_url}{path}'
    payload = {
        'client_id': config.client_id,
        'secret': config.secret,
        **data,
    }

    current_app.logger.info('[PLAID] POST %s', path)
    try:
        response = requests.post(url, json=payload, timeout=30)
    except requests.RequestException as error:
        current_app.logger.exception('[PLAID] request failure for %s: %s', path, error)
        raise PlaidRequestError(f'Plaid request failed: {error}', status_code=502) from error

    current_app.logger.info('[PLAID] %s -> %s', path, response.status_code)

    try:
        response_payload = response.json()
    except ValueError as error:
        current_app.logger.exception('[PLAID] non-JSON response for %s', path)
        raise PlaidRequestError('Plaid returned a non-JSON response', status_code=502) from error

    if not response.ok:
        request_id = str(response_payload.get('request_id') or '').strip() or None
        message = (
            str(response_payload.get('display_message') or '').strip()
            or str(response_payload.get('error_message') or '').strip()
            or f'Plaid request failed with status {response.status_code}'
        )
        if request_id:
            current_app.logger.error('[PLAID] error request_id=%s message=%s', request_id, message)
        else:
            current_app.logger.error('[PLAID] error message=%s', message)
        raise PlaidRequestError(message, status_code=response.status_code, request_id=request_id)

    if isinstance(response_payload, dict):
        return response_payload
    raise PlaidRequestError('Plaid returned an invalid response payload', status_code=502)

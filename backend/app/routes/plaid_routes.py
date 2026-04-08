from __future__ import annotations

from flask import Blueprint, current_app, request

from ..api_response import error_response, success_response
from ..auth import auth_required, get_current_user
from ..services.plaid_client import PlaidRequestError
from ..services.plaid_service import create_link_token, disconnect, exchange_public_token, get_connected_accounts


plaid_routes_bp = Blueprint('plaid_routes', __name__)


def _is_override_enabled(payload: dict[str, object]) -> bool:
    value = payload.get('override')
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {'1', 'true', 'yes', 'on'}
    return False


@plaid_routes_bp.post('/plaid/create_link_token')
@auth_required
def create_link_token_route():
    user = get_current_user()
    payload = request.get_json(silent=True) or {}
    override = _is_override_enabled(payload if isinstance(payload, dict) else {})
    try:
        link_token = create_link_token(user.id, override=override)
        return success_response({'link_token': link_token})
    except PlaidRequestError as error:
        if error.request_id:
            current_app.logger.error('Plaid request_id=%s', error.request_id)
            return error_response(f'{error} (request_id={error.request_id})', error.status_code)
        return error_response(str(error), error.status_code)
    except Exception as error:
        return error_response(str(error), 400)


@plaid_routes_bp.post('/plaid/exchange_token')
@auth_required
def exchange_token_route():
    user = get_current_user()
    payload = request.get_json(silent=True) or {}
    public_token = str(payload.get('public_token') or '').strip() if isinstance(payload, dict) else ''
    override = _is_override_enabled(payload if isinstance(payload, dict) else {})
    if not public_token:
        return error_response('public_token is required', 400)

    try:
        exchange_public_token(user.id, public_token, override=override)
        return success_response({'connected': True})
    except PlaidRequestError as error:
        if error.request_id:
            current_app.logger.error('Plaid request_id=%s', error.request_id)
            return error_response(f'{error} (request_id={error.request_id})', error.status_code)
        return error_response(str(error), error.status_code)
    except Exception as error:
        return error_response(str(error), 400)


@plaid_routes_bp.post('/plaid/disconnect')
@auth_required
def disconnect_route():
    user = get_current_user()
    disconnect(user.id)
    return success_response({'disconnected': True})


@plaid_routes_bp.get('/plaid/accounts')
@auth_required
def accounts_route():
    user = get_current_user()
    refresh = str(request.args.get('refresh', '')).strip().lower() in {'1', 'true', 'yes', 'on'}
    override = str(request.args.get('override', '')).strip().lower() in {'1', 'true', 'yes', 'on'}
    try:
        accounts = get_connected_accounts(user.id, refresh=refresh, override=override)
        return success_response({'accounts': accounts})
    except PlaidRequestError as error:
        if error.request_id:
            current_app.logger.error('Plaid request_id=%s', error.request_id)
            return error_response(f'{error} (request_id={error.request_id})', error.status_code)
        return error_response(str(error), error.status_code)
    except Exception as error:
        return error_response(str(error), 400)

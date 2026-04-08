from __future__ import annotations

from flask import Blueprint, request

from ..api_response import error_response, success_response
from ..auth import auth_required, get_current_user
from ..services.plaid_client import PlaidRequestError
from ..services.plaid_service import get_last_manual_refresh_at, get_transactions


transaction_routes_bp = Blueprint('transaction_routes', __name__)


def _override_from_payload(payload: dict[str, object]) -> bool:
    value = payload.get('override')
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {'1', 'true', 'yes', 'on'}
    return False


@transaction_routes_bp.get('/transactions')
@auth_required
def list_transactions_route():
    user = get_current_user()
    try:
        transactions = get_transactions(user.id, refresh=False, override=False)
        return success_response({
            'transactions': transactions,
            'last_manual_refresh_at': get_last_manual_refresh_at(user.id),
        })
    except PlaidRequestError as error:
        if error.request_id:
            return error_response(f'{error} (request_id={error.request_id})', error.status_code)
        return error_response(str(error), error.status_code)
    except Exception as error:
        return error_response(str(error), 400)


@transaction_routes_bp.post('/transactions/refresh')
@auth_required
def refresh_transactions_route():
    user = get_current_user()
    payload = request.get_json(silent=True) or {}
    override = _override_from_payload(payload if isinstance(payload, dict) else {})
    try:
        transactions = get_transactions(user.id, refresh=True, override=override)
        return success_response({
            'transactions': transactions,
            'last_manual_refresh_at': get_last_manual_refresh_at(user.id),
        })
    except PlaidRequestError as error:
        if error.request_id:
            return error_response(f'{error} (request_id={error.request_id})', error.status_code)
        return error_response(str(error), error.status_code)
    except Exception as error:
        return error_response(str(error), 400)

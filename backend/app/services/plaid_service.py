from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Callable, TypedDict

from flask import current_app

from ..db import db
from ..models import PlaidRuntimeState
from .plaid_client import plaid_post


class NormalizedTransaction(TypedDict):
    id: str
    date: str
    name: str
    amount: float
    type: str
    category: str
    subcategory: str
    source: str


class ConnectedAccount(TypedDict):
    account_id: str
    name: str
    official_name: str
    mask: str
    type: str
    subtype: str
    current_balance: float | None
    available_balance: float | None
    iso_currency_code: str


def _bool_env(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {'1', 'true', 'yes', 'on'}


def plaid_call_guard(name: str, fn: Callable[[], Any], override: bool = False) -> Any:
    safe_mode = _bool_env('PLAID_SAFE_MODE', True)
    if safe_mode and not override:
        current_app.logger.warning('[PLAID] safe mode blocked call: %s', name)
        raise RuntimeError(f'Plaid safe mode is enabled; blocked call: {name}')
    return fn()


def _get_state(user_id: str, create: bool = True) -> PlaidRuntimeState | None:
    state = PlaidRuntimeState.query.filter_by(user_id=user_id).first()
    if state is None and create:
        state = PlaidRuntimeState(
            user_id=user_id,
            transactions_cache=[],
            accounts_cache=[],
        )
        db.session.add(state)
        db.session.commit()
    return state


def create_link_token(user_id: str, override: bool = False) -> str:
    payload = plaid_call_guard(
        'link_token_create',
        lambda: plaid_post(
            '/link/token/create',
            {
                'client_name': 'PrideBytes',
                'user': {'client_user_id': user_id},
                'products': ['transactions'],
                'country_codes': ['US'],
                'language': 'en',
            },
        ),
        override=override,
    )
    token = str(payload.get('link_token') or '').strip()
    if not token:
        raise RuntimeError('Plaid did not return a link token')
    return token


def _normalize_account(payload: dict[str, Any]) -> ConnectedAccount:
    balances = payload.get('balances') if isinstance(payload.get('balances'), dict) else {}
    current = balances.get('current')
    available = balances.get('available')
    return {
        'account_id': str(payload.get('account_id') or ''),
        'name': str(payload.get('name') or ''),
        'official_name': str(payload.get('official_name') or ''),
        'mask': str(payload.get('mask') or ''),
        'type': str(payload.get('type') or ''),
        'subtype': str(payload.get('subtype') or ''),
        'current_balance': float(current) if isinstance(current, (int, float)) else None,
        'available_balance': float(available) if isinstance(available, (int, float)) else None,
        'iso_currency_code': str(balances.get('iso_currency_code') or ''),
    }


def exchange_public_token(user_id: str, public_token: str, override: bool = False) -> None:
    payload = plaid_call_guard(
        'item_public_token_exchange',
        lambda: plaid_post('/item/public_token/exchange', {'public_token': public_token}),
        override=override,
    )
    access_token = str(payload.get('access_token') or '').strip()
    if not access_token:
        raise RuntimeError('Plaid did not return an access token')

    state = _get_state(user_id, create=True)
    if state is None:
        raise RuntimeError('Failed to initialize plaid runtime state')

    payload_accounts = plaid_call_guard(
        'accounts_get',
        lambda: plaid_post('/accounts/get', {'access_token': access_token}),
        override=override,
    )
    account_rows = payload_accounts.get('accounts') if isinstance(payload_accounts.get('accounts'), list) else []
    normalized_accounts = [_normalize_account(account) for account in account_rows if isinstance(account, dict)]

    state.access_token = access_token
    state.sync_cursor = None
    state.transactions_cache = []
    state.accounts_cache = normalized_accounts
    state.last_manual_refresh_at = None
    db.session.commit()


def _normalize_transaction(payload: dict[str, Any]) -> NormalizedTransaction:
    raw_amount = float(payload.get('amount') or 0.0)
    tx_type = 'expense' if raw_amount >= 0 else 'income'
    amount = round(abs(raw_amount), 2)

    pfc = payload.get('personal_finance_category')
    primary = str((pfc or {}).get('primary') or '').strip() if isinstance(pfc, dict) else ''
    detailed = str((pfc or {}).get('detailed') or '').strip() if isinstance(pfc, dict) else ''
    category = primary or 'Uncategorized'
    subcategory = detailed or category

    return {
        'id': str(payload.get('transaction_id') or payload.get('pending_transaction_id') or payload.get('name') or ''),
        'date': str(payload.get('date') or ''),
        'name': str(payload.get('merchant_name') or payload.get('name') or 'Plaid Transaction'),
        'amount': amount,
        'type': tx_type,
        'category': category,
        'subcategory': subcategory,
        'source': 'plaid',
    }


def _fetch_all_transactions(access_token: str, cursor: str | None, override: bool) -> tuple[list[dict[str, Any]], str | None, set[str]]:
    has_more = True
    next_cursor = cursor
    merged: dict[str, dict[str, Any]] = {}
    removed_ids: set[str] = set()

    while has_more:
        request_payload: dict[str, Any] = {'access_token': access_token}
        if next_cursor:
            request_payload['cursor'] = next_cursor

        payload = plaid_call_guard(
            'transactions_sync',
            lambda: plaid_post('/transactions/sync', request_payload),
            override=override,
        )

        added = payload.get('added') if isinstance(payload.get('added'), list) else []
        modified = payload.get('modified') if isinstance(payload.get('modified'), list) else []
        removed = payload.get('removed') if isinstance(payload.get('removed'), list) else []

        for row in added + modified:
            if not isinstance(row, dict):
                continue
            tx_id = str(row.get('transaction_id') or '').strip()
            if tx_id:
                merged[tx_id] = row

        for row in removed:
            if not isinstance(row, dict):
                continue
            tx_id = str(row.get('transaction_id') or '').strip()
            if tx_id:
                removed_ids.add(tx_id)

        cursor_value = str(payload.get('next_cursor') or '').strip()
        next_cursor = cursor_value or next_cursor
        has_more = bool(payload.get('has_more'))

    for tx_id in removed_ids:
        merged.pop(tx_id, None)

    return list(merged.values()), next_cursor, removed_ids


def get_transactions(user_id: str, refresh: bool = False, override: bool = False) -> list[NormalizedTransaction]:
    state = _get_state(user_id, create=refresh)
    if state is None:
        return []

    if not refresh:
        return state.transactions_cache or []

    access_token = state.access_token
    if not access_token:
        return state.transactions_cache or []

    rows, next_cursor, removed_ids = _fetch_all_transactions(access_token, state.sync_cursor, override=override)
    merged = {str(tx.get('id') or ''): tx for tx in (state.transactions_cache or []) if isinstance(tx, dict)}

    for tx_id in removed_ids:
        merged.pop(tx_id, None)

    for row in rows:
        tx = _normalize_transaction(row)
        merged[tx['id']] = tx

    transactions = list(merged.values())
    transactions.sort(key=lambda row: (str(row.get('date') or ''), str(row.get('id') or '')), reverse=True)

    state.sync_cursor = next_cursor
    state.transactions_cache = transactions
    state.last_manual_refresh_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.session.commit()
    return transactions


def get_connected_accounts(user_id: str, refresh: bool = False, override: bool = False) -> list[ConnectedAccount]:
    state = _get_state(user_id, create=refresh)
    if state is None:
        return []

    if not refresh:
        return state.accounts_cache or []

    access_token = state.access_token
    if not access_token:
        state.accounts_cache = []
        db.session.commit()
        return []

    payload = plaid_call_guard(
        'accounts_get',
        lambda: plaid_post('/accounts/get', {'access_token': access_token}),
        override=override,
    )
    accounts = payload.get('accounts') if isinstance(payload.get('accounts'), list) else []
    normalized = [_normalize_account(account) for account in accounts if isinstance(account, dict)]
    state.accounts_cache = normalized
    db.session.commit()
    return normalized


def disconnect(user_id: str) -> None:
    state = _get_state(user_id, create=False)
    if state is None:
        return
    state.access_token = None
    state.sync_cursor = None
    state.transactions_cache = []
    state.accounts_cache = []
    state.last_manual_refresh_at = None
    db.session.commit()


def get_last_manual_refresh_at(user_id: str) -> str | None:
    state = _get_state(user_id, create=False)
    if state is None or state.last_manual_refresh_at is None:
        return None
    return state.last_manual_refresh_at.replace(tzinfo=timezone.utc).isoformat()

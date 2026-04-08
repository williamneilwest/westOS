from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from logging import Logger


@dataclass(frozen=True)
class PlaidConfig:
    client_id: str
    secret: str
    env: str
    base_url: str


def _resolve_base_url(env: str) -> str:
    if env == 'production':
        return 'https://production.plaid.com'
    if env == 'sandbox':
        return 'https://sandbox.plaid.com'
    raise RuntimeError("PLAID_ENV must be either 'production' or 'sandbox'")


@lru_cache(maxsize=1)
def get_plaid_config() -> PlaidConfig:
    client_id = str(os.getenv('PLAID_CLIENT_ID', '')).strip()
    secret = str(os.getenv('PLAID_SECRET', '')).strip()
    env = str(os.getenv('PLAID_ENV', 'production')).strip().lower()

    if not client_id:
        raise RuntimeError('PLAID_CLIENT_ID is required')
    if not secret:
        raise RuntimeError('PLAID_SECRET is required')

    base_url = _resolve_base_url(env)
    return PlaidConfig(
        client_id=client_id,
        secret=secret,
        env=env,
        base_url=base_url,
    )


def log_plaid_environment(logger: Logger | None = None) -> None:
    config = get_plaid_config()
    message = f'PLAID ENV: {config.env}'
    if logger is None:
        print(message)
    else:
        logger.info(message)

import os

from .auth_store import ensure_seed_user


def bootstrap_auth_user_from_env():
    username = str(os.getenv('AUTH_USER', '')).strip()
    password = str(os.getenv('AUTH_PASS', '')).strip()
    return ensure_seed_user(username, password, role='admin')

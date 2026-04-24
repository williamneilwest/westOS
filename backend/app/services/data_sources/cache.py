import time


CACHE: dict[str, dict] = {}


def get_cached(name: str):
    return CACHE.get(str(name or '').strip())


def set_cache(name: str, data):
    key = str(name or '').strip()
    if not key:
        return

    CACHE[key] = {
        'data': data,
        'timestamp': time.time(),
    }


def clear_cached(name: str):
    key = str(name or '').strip()
    if not key:
        return
    CACHE.pop(key, None)
    CACHE.pop(f'{key}::raw', None)

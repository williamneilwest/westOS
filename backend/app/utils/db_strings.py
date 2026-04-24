from __future__ import annotations

import logging


LOGGER = logging.getLogger(__name__)


def truncate_with_log(value, *, max_length: int | None, field_name: str, logger=None, strip: bool = True):
    """Safely clamp string values before DB writes and log when truncation occurs."""
    if value is None:
        return None

    normalized = str(value)
    if strip:
        normalized = normalized.strip()

    if not max_length or max_length <= 0:
        return normalized

    if len(normalized) <= max_length:
        return normalized

    active_logger = logger or LOGGER
    active_logger.warning(
        "Truncating field %s from %d to %d characters before database write.",
        field_name,
        len(normalized),
        max_length,
    )
    return normalized[:max_length]

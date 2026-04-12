from __future__ import annotations

import re
from typing import Any


TAG_MAP = {
    "ad": "active-directory",
    "active directory": "active-directory",
    "chat gpt": "chatgpt",
    "servicenow": "servicenow",
}

LOW_SIGNAL_TAGS = {
    "access",
    "request",
    "guide",
    "document",
    "file",
}

SYSTEM_TAGS = {
    "servicenow",
    "active-directory",
    "chatgpt",
    "okta",
    "azure-ad",
    "vpn",
    "exchange",
    "jira",
}

ACTION_TAGS = {
    "account-provisioning",
    "group-assignment",
    "access-modification",
    "password-reset",
    "license-assignment",
    "deprovisioning",
}

CONTEXT_TAGS = {
    "manager-approval",
    "security-review",
    "compliance",
    "phi-pii",
    "time-sensitive",
}

_MAX_TAGS_PER_ARRAY = 8

_ACTION_HINTS = {
    "account-provisioning": {"provision", "provisioning", "onboarding", "create account", "new account"},
    "group-assignment": {"group assignment", "add to group", "group add", "membership"},
    "access-modification": {"access change", "access update", "modify access", "change access"},
    "password-reset": {"password reset", "reset password"},
    "license-assignment": {"license", "assign license", "seat"},
    "deprovisioning": {"deprovision", "offboarding", "disable account", "remove access"},
}


def _normalize_space(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip().lower())


def _slugify(value: str) -> str:
    compact = re.sub(r"[^a-z0-9]+", "-", _normalize_space(value))
    return compact.strip("-")


def normalize_tag(value: Any) -> str:
    text = _slugify(str(value or ""))
    if not text:
        return ""
    remapped = TAG_MAP.get(text) or TAG_MAP.get(text.replace("-", " "))
    return remapped or text


def _dedupe(values: list[str]) -> list[str]:
    result = []
    seen = set()
    for value in values:
        normalized = str(value or "").strip()
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        result.append(normalized)
    return result


def _extract_terms_from_text(text: str) -> list[str]:
    normalized = _normalize_space(text)
    if not normalized:
        return []

    terms = [normalized]
    split_words = [part for part in re.split(r"[^a-z0-9]+", normalized) if part]
    terms.extend(split_words)

    for index in range(0, max(0, len(split_words) - 1)):
        terms.append(f"{split_words[index]} {split_words[index + 1]}")

    return terms


def _collect_seed_tags(existing_tags: list[str] | None, document_fields: dict[str, Any] | None) -> list[str]:
    terms = []

    if isinstance(existing_tags, list):
        terms.extend([str(tag or "") for tag in existing_tags])

    if not isinstance(document_fields, dict):
        return terms

    for value in document_fields.values():
        if isinstance(value, list):
            for item in value:
                terms.extend(_extract_terms_from_text(str(item or "")))
            continue
        if value is None:
            continue
        terms.extend(_extract_terms_from_text(str(value)))

    return terms


def _classify_tags(normalized_tags: list[str], classifier: set[str]) -> list[str]:
    return _dedupe([tag for tag in normalized_tags if tag in classifier])[:_MAX_TAGS_PER_ARRAY]


def _derive_primary_action(action_tags: list[str], source_text: str) -> dict[str, Any]:
    lowered_source = _normalize_space(source_text)
    score_by_action: dict[str, int] = {action: 0 for action in ACTION_TAGS}

    for action in action_tags:
        if action in score_by_action:
            score_by_action[action] += 3

    for action, hints in _ACTION_HINTS.items():
        for hint in hints:
            if hint in lowered_source:
                score_by_action[action] += 1

    best_action = None
    best_score = 0
    for action, score in score_by_action.items():
        if score > best_score:
            best_action = action
            best_score = score

    if not best_action or best_score < 3:
        return {"value": None, "confidence": 0.0}

    confidence = min(1.0, 0.55 + (0.1 * best_score))
    return {"value": best_action, "confidence": round(confidence, 2)}


def derive_tags(existing_tags: list[str] | None = None, document_fields: dict[str, Any] | None = None) -> dict[str, Any]:
    seed_terms = _collect_seed_tags(existing_tags, document_fields)
    normalized_terms = _dedupe([normalize_tag(term) for term in seed_terms if normalize_tag(term)])
    normalized_tags = [tag for tag in normalized_terms if tag not in LOW_SIGNAL_TAGS][:_MAX_TAGS_PER_ARRAY]

    system_tags = _classify_tags(normalized_tags, SYSTEM_TAGS)
    action_tags = _classify_tags(normalized_tags, ACTION_TAGS)
    context_tags = _classify_tags(normalized_tags, CONTEXT_TAGS)

    source_text = " ".join([str(value) for value in (document_fields or {}).values() if value is not None])
    primary_action = _derive_primary_action(action_tags, source_text)

    return {
        "primary_action": primary_action,
        "system_tags": system_tags,
        "action_tags": action_tags,
        "context_tags": context_tags,
        "normalized_tags": normalized_tags,
    }


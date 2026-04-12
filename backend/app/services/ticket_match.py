from __future__ import annotations

from typing import Any

from .tag_derivation import LOW_SIGNAL_TAGS, derive_tags, normalize_tag


SYSTEM_WEIGHT = 6
ACTION_WEIGHT = 4
CONTEXT_WEIGHT = 1
PRIMARY_ACTION_BONUS = 4
MATCH_THRESHOLD = 5

_LEGACY_IGNORE_TAGS = {
    "uncategorized",
    "category",
    "categories",
    "tag",
    "tags",
    "document",
    "documents",
    "file",
    "files",
    "kb",
    "knowledge-base",
}


def _safe_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item or "").strip() for item in value if str(item or "").strip()]


def _document_id_for_match(document: dict[str, Any]) -> str:
    for key in ("document_id", "id", "url", "filename"):
        value = str(document.get(key) or "").strip()
        if value:
            return value
    return "unknown"


def _legacy_doc_hit(ticket_text: str, document: dict[str, Any]) -> bool:
    lowered_text = str(ticket_text or "").lower()
    for tag in _safe_list(document.get("tags")):
        normalized = normalize_tag(tag)
        if not normalized:
            continue
        if normalized in _LEGACY_IGNORE_TAGS:
            continue
        if normalized in lowered_text:
            return True
    return False


def _prepare_document_derivation(document: dict[str, Any]) -> dict[str, Any]:
    derived = document.get("derived_tags")
    if isinstance(derived, dict):
        return {
            "primary_action": derived.get("primary_action") if isinstance(derived.get("primary_action"), dict) else {"value": None, "confidence": 0.0},
            "system_tags": _safe_list(derived.get("system_tags")),
            "action_tags": _safe_list(derived.get("action_tags")),
            "context_tags": _safe_list(derived.get("context_tags")),
            "normalized_tags": _safe_list(derived.get("normalized_tags")),
        }

    return derive_tags(
        existing_tags=_safe_list(document.get("tags")),
        document_fields={
            "filename": document.get("filename"),
            "category": document.get("category"),
        },
    )


def _intersection(left: list[str], right: list[str]) -> list[str]:
    right_set = set(right)
    return [item for item in left if item in right_set]


def match_ticket_to_kb(ticket_text: str, kb_documents: list[dict[str, Any]], enable_weighted_matching: bool = False) -> list[dict[str, Any]]:
    normalized_ticket_text = str(ticket_text or "").strip()
    ticket_model = derive_tags(existing_tags=[], document_fields={"text": normalized_ticket_text})
    ticket_system_tags = [tag for tag in _safe_list(ticket_model.get("system_tags")) if tag not in LOW_SIGNAL_TAGS]
    ticket_action_tags = [tag for tag in _safe_list(ticket_model.get("action_tags")) if tag not in LOW_SIGNAL_TAGS]
    ticket_context_tags = [tag for tag in _safe_list(ticket_model.get("context_tags")) if tag not in LOW_SIGNAL_TAGS]
    ticket_primary_action = str((ticket_model.get("primary_action") or {}).get("value") or "").strip()

    results = []
    for document in kb_documents:
        doc_model = _prepare_document_derivation(document)

        matched_system_tags = _intersection(ticket_system_tags, _safe_list(doc_model.get("system_tags")))
        matched_action_tags = _intersection(ticket_action_tags, _safe_list(doc_model.get("action_tags")))
        matched_context_tags = _intersection(ticket_context_tags, _safe_list(doc_model.get("context_tags")))

        confidence = float((doc_model.get("primary_action") or {}).get("confidence") or 0.0)
        doc_primary_action = str((doc_model.get("primary_action") or {}).get("value") or "").strip()
        primary_action_match = bool(
            ticket_primary_action
            and doc_primary_action
            and ticket_primary_action == doc_primary_action
            and confidence > 0.7
        )

        weighted_score = (
            (len(matched_system_tags) * SYSTEM_WEIGHT)
            + (len(matched_action_tags) * ACTION_WEIGHT)
            + (len(matched_context_tags) * CONTEXT_WEIGHT)
            + (PRIMARY_ACTION_BONUS if primary_action_match else 0)
        )

        legacy_hit = _legacy_doc_hit(normalized_ticket_text, document)

        if enable_weighted_matching:
            score = weighted_score
            is_match = bool(legacy_hit or score >= MATCH_THRESHOLD)
        else:
            score = 1 if legacy_hit else 0
            is_match = bool(legacy_hit)

        results.append(
            {
                "document_id": _document_id_for_match(document),
                "score": score,
                "is_match": is_match,
                "match_details": {
                    "matched_system_tags": matched_system_tags,
                    "matched_action_tags": matched_action_tags,
                    "matched_context_tags": matched_context_tags,
                    "primary_action_match": primary_action_match,
                    "confidence": round(confidence, 2),
                    "legacy_hit": legacy_hit,
                },
            }
        )

    results.sort(key=lambda item: (item.get("is_match", False), item.get("score", 0)), reverse=True)
    return results


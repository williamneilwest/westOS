TAG_MAP = {
    "printer setup": "printer",
    "print device": "printer",
    "pc": "computer",
    "laptop": "computer",
}


def normalize_tags(tags):
    if not isinstance(tags, list):
        return []

    normalized = []
    seen = set()
    for raw_tag in tags:
        tag = str(raw_tag or "").strip().lower()
        if not tag:
            continue
        tag = TAG_MAP.get(tag, tag)
        if tag in seen:
            continue
        seen.add(tag)
        normalized.append(tag)
    return normalized

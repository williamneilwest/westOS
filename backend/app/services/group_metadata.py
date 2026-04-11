import re


GROUP_NAME_SPLIT_PATTERN = re.compile(r"\s*-\s*")


def normalize_tags(value):
    if isinstance(value, list):
        items = value
    else:
        items = str(value or "").replace("\n", ",").split(",")

    normalized = []
    seen = set()
    for item in items:
        tag = str(item or "").strip()
        key = tag.lower()
        if not tag or key in seen:
            continue
        normalized.append(tag)
        seen.add(key)
    return normalized


def build_group_name_tags(name):
    group_name = str(name or "").strip()
    if not group_name:
        return []

    sections = [section.strip() for section in GROUP_NAME_SPLIT_PATTERN.split(group_name) if section.strip()]
    normalized_name = "-".join(sections) if sections else group_name

    tags = []
    if normalized_name:
        tags.append(f"group:{normalized_name}")
    tags.extend(sections)
    return normalize_tags(tags)


def merge_group_tags(existing_tags, incoming_tags="", group_name=""):
    merged = normalize_tags(existing_tags) + normalize_tags(incoming_tags) + build_group_name_tags(group_name)
    return normalize_tags(merged)

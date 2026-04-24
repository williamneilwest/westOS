from ..note_cleaner import clean_note_blob


NOTE_KEYWORDS = ('comments', 'work_notes', 'worknotes', 'combined_notes', 'workflow_activity')


def normalize_key(key: str):
    if not key:
        return key

    value = str(key).strip().lower()

    # Remove prefix before dot, e.g. u_hardware_1.asset_tag -> asset_tag
    if "." in value:
        value = value.split(".", 1)[1]

    # Replace spaces with underscores
    value = value.replace(" ", "_")

    return value


def normalize_row(row: dict):
    normalized = {}
    if not isinstance(row, dict):
        return normalized

    for key, value in row.items():
        new_key = normalize_key(key)
        if any(keyword in str(new_key or '').lower() for keyword in NOTE_KEYWORDS):
            normalized[new_key] = clean_note_blob(value)
        else:
            normalized[new_key] = value

    return normalized

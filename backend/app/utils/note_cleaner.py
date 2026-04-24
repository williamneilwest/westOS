import re
from copy import deepcopy


ACK_KEYWORDS = [
    'thank you for taking the time',
    'has received your ticket',
    'we will be in contact',
]

TEXT_KEYWORDS = [
    'text has been sent on assigned user phone number',
]

TEXT_FIELDS = ('text', 'value', 'content', 'body', 'note')


def _normalize_text(value):
    return re.sub(r'\s+', ' ', str(value or '').strip())


def _contains_keyword(value, keywords):
    normalized = _normalize_text(value).lower()
    return any(keyword in normalized for keyword in keywords)


def _clean_author(value):
    author = _normalize_text(value)
    author = re.sub(r'\s*\([^)]*\)\s*$', '', author).strip()
    return author or 'User'


def _extract_author_from_text(value):
    text = str(value or '').strip()
    first_line = text.splitlines()[0].strip() if text else ''
    if re.search(r'\b(additional comments|work notes?|comments?)\b', first_line, re.IGNORECASE):
        return _clean_author(first_line)
    return ''


def _text_field(note):
    for field in TEXT_FIELDS:
        if field in note:
            return field
    return 'text'


def _clean_note_text(text, author=''):
    normalized = _normalize_text(text)
    if not normalized:
        return ''
    if _contains_keyword(normalized, TEXT_KEYWORDS):
        return ''
    if _contains_keyword(normalized, ACK_KEYWORDS):
        return f'{_clean_author(author or _extract_author_from_text(text))} acknowledged the ticket.'
    return normalized


def clean_ticket_notes(notes: list[dict]) -> list[dict]:
    """
    notes = [
        {
            "author": str,
            "timestamp": str,
            "text": str,
            "type": str  # optional
        }
    ]
    """
    if not isinstance(notes, list):
        return []

    cleaned_notes = []
    seen = set()
    previous_key = ''

    for note in notes:
        if not isinstance(note, dict):
            continue

        field = _text_field(note)
        next_note = deepcopy(note)
        cleaned_text = _clean_note_text(next_note.get(field), next_note.get('author'))
        if not cleaned_text:
            continue

        next_note[field] = cleaned_text
        key = cleaned_text.lower()
        if key == previous_key or key in seen:
            continue

        seen.add(key)
        previous_key = key
        cleaned_notes.append(next_note)

    return cleaned_notes


def clean_note_blob(value):
    text = str(value or '').strip()
    if not text:
        return ''

    chunks = [chunk.strip() for chunk in re.split(r'\n\s*\n+', text) if chunk.strip()]
    if not chunks:
        chunks = [text]

    notes = []
    for chunk in chunks:
        notes.append({
            'author': _extract_author_from_text(chunk),
            'text': chunk,
        })

    return '\n\n'.join(note['text'] for note in clean_ticket_notes(notes)).strip()

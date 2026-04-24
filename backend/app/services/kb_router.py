import json
import logging
import os
import re
from pathlib import Path

from flask import current_app

from .ai_client import send_chat
from ..utils.storage import get_kb_dir

LOGGER = logging.getLogger(__name__)

KB_ROUTE_PATTERNS = (
    r'\bhow do i\b',
    r'\bhow to\b',
    r'\bsteps to\b',
    r'\bprocedure\b',
    r'\bprocess\b',
    r'\bguide\b',
    r'\binstructions?\b',
    r'\bpolicy\b',
    r'\bknowledge base\b',
    r'\bkb\b',
    r'\bwhere do i go\b',
    r'\bwhat is the process for\b',
)

GENERIC_CHUNK_PATTERNS = (
    r'\bthis document contains\b',
    r'\bthis document outlines\b',
    r'\bthis document describes\b',
    r'\bintroduction\b',
    r'\boverview\b',
    r'\barchitecture\b',
    r'\bvendor\b',
    r'\bproduct description\b',
    r'\bproduct overview\b',
    r'\bgeneral infrastructure\b',
    r'\binfrastructure (details|description|overview)\b',
)

ACTION_VERB_PATTERNS = (
    r'\bverify\b',
    r'\bupdate\b',
    r'\bremove\b',
    r'\bwipe\b',
    r'\bassign\b',
    r'\bbackup\b',
    r'\btransfer\b',
    r'\bsubmit\b',
    r'\bopen\b',
    r'\bcomplete\b',
)


def _normalize_text(value):
    return re.sub(r'\s+', ' ', str(value or '').strip().lower())


def _tokenize(query):
    return [token for token in re.findall(r'[a-z0-9]+', _normalize_text(query)) if len(token) > 1]


def _stem_token(token):
    normalized = str(token or '').strip().lower()
    for suffix in ('ing', 'tion', 'sion', 'ment', 'able', 'ible', 'ally', 'edly', 'ed', 'es', 's', 'al'):
        if len(normalized) > 4 and normalized.endswith(suffix):
            normalized = normalized[: -len(suffix)]
            break
    return normalized


def _tokens_match(left, right):
    a = _stem_token(left)
    b = _stem_token(right)
    if not a or not b:
        return False
    if a == b:
        return True
    if a in b or b in a:
        return True
    return len(a) >= 5 and len(b) >= 5 and a[:5] == b[:5]


def _safe_json(path):
    try:
        with open(path, 'r', encoding='utf-8') as handle:
            parsed = json.load(handle)
            return parsed if isinstance(parsed, dict) else {}
    except (OSError, json.JSONDecodeError):
        return {}


def _trim_text(value, max_length=900):
    text = str(value or '').strip()
    return text if len(text) <= max_length else f'{text[:max_length].rstrip()}...'


def _parse_embedded_json(value):
    text = str(value or '').strip()
    if not text:
        return {}
    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        return {}


def classify_route(query):
    normalized = _normalize_text(query)
    if not normalized:
        return {
            'route': 'general',
            'intent': 'general',
            'user_query': str(query or ''),
            'confidence': 0.0,
        }

    matched = any(re.search(pattern, normalized) for pattern in KB_ROUTE_PATTERNS)
    if matched:
        return {
            'route': 'kb',
            'intent': 'procedure_lookup',
            'user_query': str(query or ''),
            'confidence': 0.95,
        }

    return {
        'route': 'general',
        'intent': 'general',
        'user_query': str(query or ''),
        'confidence': 0.7,
    }


def _read_kb_records():
    records = []
    kb_root = Path(get_kb_dir())
    try:
        categories = sorted(os.listdir(kb_root))
    except OSError:
        categories = []

    for category in categories:
        category_dir = kb_root / category
        if not category_dir.is_dir() or category == 'processed':
            continue

        try:
            names = os.listdir(category_dir)
        except OSError:
            names = []

        for name in names:
            if name.endswith('.meta.json') or name.lower().endswith('.old'):
                continue
            file_path = category_dir / name
            if not file_path.is_file():
                continue

            metadata = _safe_json(str(category_dir / f'{name}.meta.json'))
            analysis = metadata.get('analysis') if isinstance(metadata.get('analysis'), dict) else {}
            title = str(metadata.get('originalName') or name).strip()
            summary = str(analysis.get('summary') or metadata.get('summary') or '').strip()
            full_analysis = _parse_embedded_json(analysis.get('full_analysis'))
            raw_analysis = _parse_embedded_json(analysis.get('raw'))
            tags = metadata.get('tags') if isinstance(metadata.get('tags'), list) else []
            search_blob = ' '.join(
                [
                    title,
                    str(metadata.get('subject') or ''),
                    str(category),
                    ' '.join(str(tag or '') for tag in tags),
                    summary,
                ]
            )
            records.append(
                {
                    'doc_id': f'work-kb:{category}/{name}',
                    'title': title or name,
                    'category': category,
                    'tags': [str(tag or '').strip().lower() for tag in tags if str(tag or '').strip()],
                    'summary': summary,
                    'search_blob': _normalize_text(search_blob),
                    'analysis_payload': full_analysis or raw_analysis,
                }
            )

    base_dir = Path(str(current_app.config.get('BACKEND_DATA_DIR', '/app/data')).strip() or '/app/data')
    index_path = base_dir / 'kb' / 'index.json'
    if index_path.exists():
        try:
            with index_path.open('r', encoding='utf-8') as handle:
                indexed = json.load(handle)
        except (OSError, json.JSONDecodeError):
            indexed = []

        if isinstance(indexed, list):
            for entry in indexed:
                if not isinstance(entry, dict):
                    continue
                doc_id = str(entry.get('doc_id') or '').strip()
                if not doc_id:
                    continue

                doc_dir = base_dir / 'kb' / doc_id
                summary_path = doc_dir / 'summary.txt'
                original_path = doc_dir / 'original.txt'
                summary = ''
                original = ''
                if summary_path.exists():
                    try:
                        summary = summary_path.read_text(encoding='utf-8', errors='replace')
                    except OSError:
                        summary = ''
                if original_path.exists():
                    try:
                        original = original_path.read_text(encoding='utf-8', errors='replace')
                    except OSError:
                        original = ''

                title = str(entry.get('title') or doc_id).strip()
                tags = entry.get('tags') if isinstance(entry.get('tags'), list) else []
                systems = entry.get('systems') if isinstance(entry.get('systems'), list) else []
                hints = entry.get('search_hints') if isinstance(entry.get('search_hints'), list) else []
                search_blob = ' '.join(
                    [
                        title,
                        ' '.join(str(tag or '') for tag in tags),
                        ' '.join(str(system or '') for system in systems),
                        ' '.join(str(hint or '') for hint in hints),
                        summary,
                    ]
                )
                records.append(
                    {
                        'doc_id': f'kb-index:{doc_id}',
                        'title': title or doc_id,
                        'category': 'indexed',
                        'tags': [str(tag or '').strip().lower() for tag in tags if str(tag or '').strip()],
                        'summary': _trim_text(summary, max_length=700),
                        'summary_text': summary,
                        'original_text': original,
                        'analysis_payload': {},
                        'search_blob': _normalize_text(search_blob),
                    }
                )

    return records


def _score_record(record, query_tokens, normalized_query):
    score = 0.0
    blob = str(record.get('search_blob') or '')
    if not blob:
        return score

    for token in query_tokens:
        if token in blob:
            score += 1.0
    if normalized_query and normalized_query in blob:
        score += 3.0

    for phrase in ('asset disposal', 'asset retire', 'hardware disposal', 'retire asset'):
        if phrase in normalized_query and phrase in blob:
            score += 2.0
    return score


def retrieve_documents(query, limit=5):
    normalized_query = _normalize_text(query)
    query_tokens = _tokenize(query)
    records = _read_kb_records()
    scored = []
    for record in records:
        score = _score_record(record, query_tokens, normalized_query)
        if score <= 0:
            continue
        scored.append((score, record))

    scored.sort(key=lambda item: item[0], reverse=True)
    documents = []
    for score, record in scored[: max(1, int(limit or 5))]:
        documents.append({**record, 'score': round(score, 3)})

    LOGGER.info('[KB] retrieved document count=%s', len(documents))
    return documents


def _chunk_score(chunk_text, query_tokens):
    chunk_tokens = _tokenize(chunk_text)
    if not chunk_tokens or not query_tokens:
        return 0.0
    matched = 0
    seen = set()
    for query_token in query_tokens:
        if query_token in seen:
            continue
        if any(_tokens_match(query_token, chunk_token) for chunk_token in chunk_tokens):
            matched += 1
            seen.add(query_token)
    return matched / max(1, len(set(query_tokens)))


def _is_generic_chunk(text):
    normalized = _normalize_text(text)
    if not normalized:
        return True
    return any(re.search(pattern, normalized) for pattern in GENERIC_CHUNK_PATTERNS)


def _is_query_relevant(text, query_tokens):
    chunk_tokens = _tokenize(text)
    if not chunk_tokens:
        return False

    overlap = sum(1 for token in query_tokens if any(_tokens_match(token, chunk_token) for chunk_token in chunk_tokens))
    # Require at least two overlapping terms, or one strong term + action language.
    if overlap >= 2:
        return True
    if overlap >= 1 and any(re.search(pattern, _normalize_text(text)) for pattern in ACTION_VERB_PATTERNS):
        return True
    return False


def _best_scored_chunk(chunks):
    if not chunks:
        return {}
    return max(chunks, key=lambda item: float(item.get('score') or 0.0))


def _iter_text_chunks(text, max_chars=1200):
    raw = str(text or '').strip()
    if not raw:
        return
    blocks = [part.strip() for part in re.split(r'\n{2,}', raw) if part.strip()]
    for block in blocks:
        compact = re.sub(r'[ \t]+', ' ', block).strip()
        if not compact:
            continue
        if len(compact) <= max_chars:
            yield compact
            continue
        sentences = re.split(r'(?<=[.!?])\s+', compact)
        current = []
        current_len = 0
        for sentence in sentences:
            sent = sentence.strip()
            if not sent:
                continue
            projected = current_len + len(sent) + (1 if current else 0)
            if projected > max_chars and current:
                yield ' '.join(current).strip()
                current = [sent]
                current_len = len(sent)
            else:
                current.append(sent)
                current_len = projected
        if current:
            yield ' '.join(current).strip()


def _flatten_analysis_chunks(payload):
    if not isinstance(payload, dict):
        return []
    chunks = []

    summary = payload.get('summary')
    if isinstance(summary, list):
        chunks.extend([str(item or '').strip() for item in summary if str(item or '').strip()])
    elif isinstance(summary, str) and summary.strip():
        chunks.append(summary.strip())

    for key in ('purpose', 'steps', 'validation', 'critical_details', 'constraints'):
        value = payload.get(key)
        if isinstance(value, list):
            chunks.extend([str(item or '').strip() for item in value if str(item or '').strip()])
        elif isinstance(value, str) and value.strip():
            chunks.append(value.strip())

    detailed = payload.get('detailed_analysis')
    if isinstance(detailed, dict):
        for value in detailed.values():
            if isinstance(value, list):
                chunks.extend([str(item or '').strip() for item in value if str(item or '').strip()])
            elif isinstance(value, str) and value.strip():
                chunks.append(value.strip())

    return chunks


def _build_candidate_chunks(document):
    chunks = []
    for item in _flatten_analysis_chunks(document.get('analysis_payload') or {}):
        chunks.extend(list(_iter_text_chunks(item)))

    for key in ('summary_text', 'summary', 'original_text'):
        chunks.extend(list(_iter_text_chunks(document.get(key) or '')))

    deduped = []
    seen = set()
    for chunk in chunks:
        normalized = _normalize_text(chunk)
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        deduped.append(chunk)
    return deduped


def extract_relevant_chunks(documents, query, limit=6):
    query_tokens = _tokenize(query)
    max_document_score = max([float(doc.get('score') or 0.0) for doc in documents], default=1.0) or 1.0
    scored_chunks = []
    discarded_chunks = []
    # Keep per-document candidate chunk lists for neighbor inclusion
    candidates_map = {}

    for document in documents:
        title = str(document.get('title') or document.get('doc_id') or 'KB Document').strip()
        candidate_chunks = _build_candidate_chunks(document)
        candidates_map[str(document.get('doc_id') or title)] = candidate_chunks
        # tag boosting context
        doc_tags = [str(t or '').strip().lower() for t in (document.get('tags') or []) if str(t or '').strip()]
        # count tag/query intersections
        tag_matches = [t for t in doc_tags if t in set(query_tokens)]

        for idx, chunk_text in enumerate(candidate_chunks):
            if not str(chunk_text).strip():
                continue
            if _is_generic_chunk(chunk_text):
                discarded_chunks.append(
                    {
                        'doc_id': document.get('doc_id'),
                        'title': title,
                        'reason': 'generic_filter',
                        'text_preview': _trim_text(chunk_text, max_length=160),
                    }
                )
                continue
            # Fail safely: if tags match query, allow even if query relevance is low
            query_relevant = _is_query_relevant(chunk_text, query_tokens)
            if not query_relevant and not tag_matches:
                discarded_chunks.append(
                    {
                        'doc_id': document.get('doc_id'),
                        'title': title,
                        'reason': 'query_mismatch',
                        'text_preview': _trim_text(chunk_text, max_length=160),
                    }
                )
                continue
            keyword_similarity = _chunk_score(chunk_text, query_tokens)
            document_prior = float(document.get('score') or 0.0) / max_document_score
            score = (0.85 * keyword_similarity) + (0.15 * document_prior)
            # Tag boosting: +0.3 per matching tag, capped at +0.5 total
            tag_boost = min(0.5, 0.3 * len(tag_matches)) if tag_matches else 0.0
            score += tag_boost
            # Prefer chunks containing action-oriented procedure language.
            if any(re.search(pattern, _normalize_text(chunk_text)) for pattern in ACTION_VERB_PATTERNS):
                score = min(1.0, score + 0.08)
            score = round(max(0.0, min(score, 1.0)), 3)
            if score <= 0.0 and not tag_matches:
                discarded_chunks.append(
                    {
                        'doc_id': document.get('doc_id'),
                        'title': title,
                        'reason': 'non_positive_score',
                        'text_preview': _trim_text(chunk_text, max_length=160),
                    }
                )
                continue
            scored_chunks.append(
                {
                    'doc_id': document.get('doc_id'),
                    'title': title,
                    'text': _trim_text(chunk_text, max_length=1200),
                    'score': score,
                    'chunk_index': idx,
                    'tag_matches': list(tag_matches),
                    'keyword_similarity': round(keyword_similarity, 3),
                    'document_prior': round(document_prior, 3),
                    'tag_boost': round(tag_boost, 3),
                }
            )

    scored_chunks.sort(key=lambda item: item.get('score', 0), reverse=True)
    chunk_limit = min(3, max(1, int(limit or 3)))
    chunks = scored_chunks[:chunk_limit]

    # Include neighboring chunks for context (previous and next)
    selected_with_neighbors = []
    seen_keys = set()
    for item in chunks:
        doc_id = item.get('doc_id')
        idx = int(item.get('chunk_index') or 0)
        candidate_list = candidates_map.get(str(doc_id) or str(item.get('title') or '')) or []
        # base selected chunk
        for neighbor_idx, rel in ((idx, 'self'), (idx - 1, 'prev'), (idx + 1, 'next')):
            if 0 <= neighbor_idx < len(candidate_list):
                neighbor_text = _trim_text(candidate_list[neighbor_idx], max_length=1200)
                key = (str(doc_id or ''), _normalize_text(neighbor_text))
                if key in seen_keys:
                    continue
                seen_keys.add(key)
                # neighbor inherits metadata but with slight score penalty except self
                neighbor_score = float(item.get('score') or 0.0)
                if rel != 'self':
                    neighbor_score = round(max(0.0, neighbor_score - 0.05), 3)
                selected_with_neighbors.append(
                    {
                        'doc_id': doc_id,
                        'title': item.get('title'),
                        'text': neighbor_text,
                        'score': neighbor_score,
                        'relation': rel,
                    }
                )

    # Respect overall limit but prefer keeping neighbors; trim if excessive
    chunks = selected_with_neighbors[: max(3, chunk_limit * 2)]
    selected_keys = {
        (
            str(chunk.get('doc_id') or ''),
            _normalize_text(str(chunk.get('text') or '')),
        )
        for chunk in chunks
    }
    for chunk in scored_chunks[chunk_limit:]:
        chunk_key = (str(chunk.get('doc_id') or ''), _normalize_text(str(chunk.get('text') or '')))
        if chunk_key in selected_keys:
            continue
        discarded_chunks.append(
            {
                'doc_id': chunk.get('doc_id'),
                'title': chunk.get('title'),
                'reason': 'ranked_below_top_n',
                'score': chunk.get('score'),
                'text_preview': _trim_text(chunk.get('text'), max_length=160),
            }
        )
    LOGGER.info(
        '[KB] chunk scoring all=%s selected=%s discarded=%s',
        [
            {
                'doc_id': chunk.get('doc_id'),
                'score': chunk.get('score'),
                'kw_sim': chunk.get('keyword_similarity'),
                'doc_prior': chunk.get('document_prior'),
                'tag_boost': chunk.get('tag_boost'),
                'tag_matches': chunk.get('tag_matches'),
                'text_preview': _trim_text(chunk.get('text'), max_length=120),
            }
            for chunk in scored_chunks
        ],
        [
            {
                'doc_id': chunk.get('doc_id'),
                'score': chunk.get('score'),
                'relation': chunk.get('relation', 'self'),
                'text_preview': _trim_text(chunk.get('text'), max_length=120),
            }
            for chunk in chunks
        ],
        discarded_chunks,
    )
    LOGGER.info(
        '[KB] extracted chunk count=%s ranked_count=%s selected_scores=%s',
        len(chunks),
        len(scored_chunks),
        [chunk.get('score') for chunk in chunks],
    )
    return chunks


def _extract_json(value):
    text = str(value or '').strip()
    if not text:
        return {}
    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        pass

    match = re.search(r'\{[\s\S]*\}', text)
    if not match:
        return {}
    try:
        parsed = json.loads(match.group(0))
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        return {}


def _detect_procedure(text):
    normalized = _normalize_text(text)
    if not normalized:
        return False
    if re.search(r'\bstep\b|\bprocedure\b|\bfirst\b|\bnext\b|\bthen\b', normalized):
        return True
    if re.search(r'^\s*\d+[.)]\s+', str(text or ''), flags=re.MULTILINE):
        return True
    if any(re.search(pattern, normalized) for pattern in ACTION_VERB_PATTERNS):
        return True
    return False


def _extract_fallback_steps(text, limit=6):
    raw = str(text or '')
    numbered_steps = [item.strip() for item in re.findall(r'^\s*\d+[.)]\s+(.+)$', raw, flags=re.MULTILINE) if item.strip()]
    bullet_steps = [item.strip() for item in re.findall(r'^\s*[-*]\s+(.+)$', raw, flags=re.MULTILINE) if item.strip()]
    line_steps = [line.strip(' -*\t') for line in raw.splitlines() if line.strip()]
    candidates = [(line, True) for line in [*numbered_steps, *bullet_steps]] + [(line, False) for line in line_steps]
    steps = []
    for line, forced in candidates:
        normalized = re.sub(r'^\d+[.)]\s*', '', line).strip()
        if not normalized or len(normalized.split()) < 2:
            continue
        if not forced and not any(re.search(pattern, _normalize_text(normalized)) for pattern in ACTION_VERB_PATTERNS):
            continue
        if normalized not in steps:
            steps.append(normalized)
        if len(steps) >= limit:
            break
    return steps


def _fallback_summary_from_chunks(chunks):
    if not chunks:
        return {
            'answer_type': 'low_confidence',
            'title': 'KB Result',
            'summary': 'I found related KB content, but direct article linking is recommended.',
            'steps': [],
            'source': 'Unknown',
            'confidence': 0.4,
            'note': 'Fallback summary used due to incomplete AI synthesis',
        }

    best_chunk = _best_scored_chunk(chunks)
    source_title = str(best_chunk.get('title') or best_chunk.get('doc_id') or 'KB Document').strip()
    combined = ' '.join(str(chunk.get('text') or '') for chunk in chunks[:2]).strip()
    sentences = [part.strip() for part in re.split(r'(?<=[.!?])\s+', combined) if part.strip()]
    summary = ' '.join(sentences[:3]).strip()
    if not summary:
        summary = _trim_text(combined, max_length=360) or 'Relevant document found, showing extracted content.'

    steps = _extract_fallback_steps(combined, limit=6) if _detect_procedure(combined) else []
    return {
        'answer_type': 'fallback_summary',
        'title': source_title,
        'summary': summary,
        'steps': steps,
        'source': source_title,
        'confidence': 0.4,
        'note': 'Fallback summary used due to incomplete AI synthesis',
    }


def _fallback_no_match(query):
    query_tokens = _tokenize(query)
    key_topic = ' '.join(query_tokens[:2]).strip() or 'this topic'
    return {
        'answer_type': 'no_match',
        'title': 'No strong KB match',
        'summary': 'I could not find a relevant knowledge base article.',
        'steps': [],
        'source': 'Knowledge Base',
        'confidence': 0.2,
        'suggestions': [
            f'Try searching by {key_topic}',
            'Try searching by asset disposal',
            'Try searching by asset retirement',
            'Try searching by hardware disposal',
        ],
    }


def _normalize_kb_answer(parsed, chunks, top_score):
    best_chunk = _best_scored_chunk(chunks)
    source_title = str(best_chunk.get('title') or best_chunk.get('doc_id') or 'KB Document').strip() if chunks else 'Unknown'
    answer_type = str(parsed.get('answer_type') or '').strip().lower()
    if answer_type not in {'procedure', 'summary'}:
        answer_type = 'procedure' if chunks and _detect_procedure(best_chunk.get('text')) else 'summary'

    summary = str(parsed.get('summary') or '').strip()
    steps = parsed.get('steps') if isinstance(parsed.get('steps'), list) else []
    steps = [str(step or '').strip() for step in steps if str(step or '').strip()]

    combined_text = ' '.join(str(chunk.get('text') or '') for chunk in chunks).strip()
    if not steps and chunks and _detect_procedure(combined_text):
        steps = _extract_fallback_steps(combined_text, limit=6)
        if steps and answer_type == 'summary':
            answer_type = 'procedure'

    if not summary:
        fallback = _fallback_summary_from_chunks(chunks)
        summary = fallback['summary']
        if not steps:
            steps = fallback.get('steps') or []
        if answer_type == 'summary' and steps:
            answer_type = 'procedure'

    confidence = parsed.get('confidence')
    try:
        confidence = float(confidence)
    except (TypeError, ValueError):
        confidence = min(0.96, 0.52 + (float(top_score or 0.0) * 0.08))
    confidence = max(0.0, min(confidence, 1.0))

    return {
        'answer_type': answer_type,
        'title': str(parsed.get('title') or source_title or 'KB Answer').strip() or 'KB Answer',
        'summary': summary,
        'steps': steps,
        'source': str(parsed.get('source') or source_title).strip() or source_title,
        'confidence': confidence,
    }


def generate_answer_from_chunks(chunks, user_query, routing):
    if not chunks:
        return _fallback_no_match(user_query), False

    prompt = (
        'You are a knowledge base assistant.\n\n'
        'Answer the user\'s question using ONLY the relevant content below.\n\n'
        'User question:\n{{query}}\n\n'
        'Relevant content:\n{{top_chunks}}\n\n'
        'Rules:\n'
        '- Only include information that directly answers the question\n'
        '- Ignore document descriptions or unrelated sections\n'
        '- If steps exist, return step-by-step instructions\n'
        '- DO NOT summarize the entire document\n'
        '- DO NOT describe what the document is about\n'
        '- DO NOT include irrelevant technical details\n\n'
        'Return ONLY JSON using this schema:\n'
        '{\n'
        '  "answer_type": "procedure" | "summary",\n'
        '  "title": "string",\n'
        '  "summary": "string",\n'
        '  "steps": ["string"],\n'
        '  "confidence": 0.0\n'
        '}'
    )

    parsed = {}
    summarization_success = False
    fallback_triggered = False

    try:
        result = send_chat(
            {
                'message': prompt,
                'analysis_mode': 'kb_lookup',
                'context': {
                    'query': str(user_query or ''),
                    'routing': routing,
                    'top_chunks': chunks,
                },
                'route_selected': 'kb',
                'source_agent': 'kb_ingestion',
                'original_user_query': str(user_query or ''),
                'response_type': 'kb_answer',
            },
            timeout_seconds=(5, 60),
        )
        parsed = _extract_json(result.get('message'))
        summarization_success = isinstance(parsed, dict) and bool(parsed)
    except Exception as error:
        LOGGER.warning('[KB] summarization failed error=%s', error)

    if not summarization_success:
        fallback_triggered = True
        fallback = _fallback_summary_from_chunks(chunks)
        LOGGER.info('[KB] summarization success=false fallback_triggered=true')
        return fallback, fallback_triggered

    top_score = float(_best_scored_chunk(chunks).get('score') or 0.0) if chunks else 0.0
    normalized = _normalize_kb_answer(parsed, chunks, top_score)

    if not str(normalized.get('summary') or '').strip():
        fallback_triggered = True
        normalized = _fallback_summary_from_chunks(chunks)

    LOGGER.info(
        '[KB] summarization success=true fallback_triggered=%s used_chunks=%s',
        str(fallback_triggered).lower(),
        [chunk.get('doc_id') for chunk in chunks],
    )
    return normalized, fallback_triggered


def answer_kb_query(user_query, routing):
    documents = retrieve_documents(user_query, limit=5)
    if not documents:
        return {
            'answer_type': 'kb_no_match',
            'title': 'No matching KB article',
            'message': 'I could not find a relevant knowledge base article.',
            'document_id': '',
            'confidence': 0.0,
        }, []

    query_tokens = _tokenize(user_query)
    max_doc_score = max([float(item.get('score') or 0.0) for item in documents], default=0.0) or 1.0
    threshold = 0.4

    def _has_tag_match(document):
        tags = [str(tag or '').strip().lower() for tag in (document.get('tags') or []) if str(tag or '').strip()]
        if not tags or not query_tokens:
            return False
        for tag in tags:
            tag_tokens = _tokenize(tag) or [tag]
            for query_token in query_tokens:
                if any(_tokens_match(query_token, tag_token) for tag_token in tag_tokens):
                    return True
        return False

    ranked_matches = []
    for document in documents:
        raw_score = float(document.get('score') or 0.0)
        relevance = round(max(0.0, min(1.0, raw_score / max_doc_score)), 3)
        tag_match = _has_tag_match(document)
        is_valid = relevance >= threshold or tag_match
        ranked_matches.append(
            {
                'document_id': str(document.get('doc_id') or '').strip(),
                'title': str(document.get('title') or 'KB Article').strip() or 'KB Article',
                'confidence': relevance,
                'tag_match': tag_match,
                'is_valid': is_valid,
            }
        )

    valid_matches = [item for item in ranked_matches if item.get('is_valid')]
    if not valid_matches:
        return {
            'answer_type': 'kb_no_match',
            'title': 'No matching KB article',
            'message': 'I could not find a relevant knowledge base article.',
            'document_id': '',
            'confidence': 0.0,
            'matches': ranked_matches[:3],
        }, documents

    primary = valid_matches[0]
    response = {
        'answer_type': 'kb_link',
        'title': primary['title'],
        'message': 'I found a relevant knowledge base article.',
        'document_id': primary['document_id'],
        'confidence': primary['confidence'],
    }

    if len(valid_matches) > 1:
        response['matches'] = valid_matches[:3]

    return response, documents

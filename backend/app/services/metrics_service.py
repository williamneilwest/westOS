import re
from datetime import datetime, timedelta, timezone

from .settings_store import get_keyword_settings


STOPWORDS = {
    'a', 'the', 'and', 'or', 'is', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
    'an', 'be', 'this', 'that', 'it', 'as', 'are', 'was', 'were', 'from',
    'request', 'requesting', 'requested', 'requests',
    'not', 'working', 'task', 'room', 'service', 'installation', 'sourcing',
    'issue', 'issues', 'problem', 'problems', 'incident', 'incidents',
    'case', 'cases', 'ticket', 'tickets', 'support', 'help',
    'failure', 'failures', 'outage', 'outages', 'error', 'errors',
    'broken',
}


def _normalize(value):
    return str(value if value is not None else '').strip()


def _lower(value):
    return _normalize(value).lower()


def _parse_date(value):
    text = _normalize(value)
    if not text:
        return None

    normalized = text.replace('Z', '+00:00')
    try:
        parsed = datetime.fromisoformat(normalized)
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except ValueError:
        pass

    for date_format in (
        '%Y-%m-%d %H:%M:%S',
        '%Y-%m-%d',
        '%m/%d/%Y %I:%M:%S %p',
        '%m/%d/%Y %H:%M:%S',
        '%m/%d/%Y',
        '%m-%d-%Y %I:%M:%S %p',
        '%m-%d-%Y %H:%M:%S',
        '%m-%d-%Y',
    ):
        try:
            return datetime.strptime(text, date_format).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def _columns_from_rows(rows):
    columns = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        for key in row.keys():
            column = _normalize(key)
            if column and column not in columns:
                columns.append(column)
    return columns


def _get_column(columns, patterns):
    for column in columns:
        if any(pattern.search(str(column or '')) for pattern in patterns):
            return column
    return ''


def _is_closed_state(value):
    normalized = _lower(value)
    return bool(re.search(r'closed|resolved|complete|completed|done|cancelled|canceled', normalized))


def _is_open_state(value):
    normalized = _lower(value)
    return not normalized or not _is_closed_state(normalized)


def _is_high_priority(value):
    normalized = _lower(value)
    return normalized in {'1', '2'} or bool(re.search(r'critical|high', normalized))


def _is_unassigned(value):
    normalized = _lower(value)
    return not normalized or normalized == 'unassigned'


def _is_flagged(row):
    if not isinstance(row, dict):
        return False
    for key, value in row.items():
        if 'flag' not in _lower(key):
            continue
        if _lower(value) in {'true', '1', 'yes', 'y', 'flagged'}:
            return True
    return False


def _count_by(rows, resolver):
    counts = {}
    for row in rows:
        key = resolver(row)
        counts[key] = counts.get(key, 0) + 1
    return [
        {'label': label, 'count': count}
        for label, count in sorted(counts.items(), key=lambda item: item[1], reverse=True)
    ]


def _percent(count, total):
    if not total:
        return '0%'
    return f'{round((count / total) * 100)}%'


def _metric(label, value, detail=''):
    return {'label': label, 'value': value, 'detail': detail}


def _ticket_number(row, ticket_column, description_column=''):
    return _normalize(row.get(ticket_column)) or _normalize(row.get(description_column)) or 'Untitled ticket'


def _ticket_type(row, ticket_column, description_column=''):
    value = _ticket_number(row, ticket_column, description_column).upper()
    if value.startswith('REQ'):
        return 'req'
    if value.startswith('INC'):
        return 'incident'
    if value.startswith('TASK'):
        return 'task'
    return 'task'


def _ticket_item(row, *, ticket_column, state_column, assignee_column, opened_column, description_column, priority_column):
    return {
        'id': _ticket_number(row, ticket_column, description_column),
        'title': _normalize(row.get(description_column)) or _ticket_number(row, ticket_column),
        'state': _normalize(row.get(state_column)) or 'Unknown',
        'assignee': _normalize(row.get(assignee_column)) or 'Unassigned',
        'openedAt': _normalize(row.get(opened_column)) or '',
        'priority': _normalize(row.get(priority_column)) or '',
        'type': _ticket_type(row, ticket_column, description_column),
    }


def _ticket_items(rows, *, ticket_column, state_column, assignee_column, opened_column, description_column, priority_column, limit=250):
    return [
        _ticket_item(
            row,
            ticket_column=ticket_column,
            state_column=state_column,
            assignee_column=assignee_column,
            opened_column=opened_column,
            description_column=description_column,
            priority_column=priority_column,
        )
        for row in rows[:limit]
    ]


def _build_ai_summary(overview, activity, ownership):
    total = overview.get('total', 0)
    if not total:
        return ''

    state = activity.get('state_distribution', [{}])[0].get('label', 'Unknown')
    owner = ownership.get('most_active_assignees', [{}])[0].get('label', 'No assigned users')
    stale = overview.get('stale', 0)
    unassigned = overview.get('unassigned', 0)
    return (
        f'{total} active ticket rows are loaded. The leading state is {state}, '
        f'the busiest real assignee is {owner}, with {stale} stale tickets and {unassigned} unassigned tickets.'
    )


def generate_ticket_metrics(tickets: list[dict], columns: list[str] | None = None) -> dict:
    rows = [row for row in (tickets if isinstance(tickets, list) else []) if isinstance(row, dict)]
    headers = columns if isinstance(columns, list) and columns else _columns_from_rows(rows)
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)
    three_days_ago = now - timedelta(days=3)

    state_column = _get_column(headers, [re.compile(r'^state$', re.I), re.compile(r'^status$', re.I)])
    assignee_column = _get_column(headers, [re.compile(r'assigned_to', re.I), re.compile(r'assignee', re.I), re.compile(r'owner', re.I)])
    updated_column = _get_column(headers, [re.compile(r'sys_updated_on', re.I), re.compile(r'updated', re.I)])
    opened_column = _get_column(headers, [re.compile(r'^opened_at$', re.I), re.compile(r'created_on', re.I), re.compile(r'sys_created_on', re.I), re.compile(r'opened', re.I)])
    closed_column = _get_column(headers, [re.compile(r'closed_at', re.I), re.compile(r'resolved_at', re.I), re.compile(r'closed_on', re.I), re.compile(r'resolved_on', re.I)])
    description_column = _get_column(headers, [re.compile(r'short_description', re.I), re.compile(r'subject', re.I), re.compile(r'title', re.I)])
    priority_column = _get_column(headers, [re.compile(r'^priority$', re.I), re.compile(r'severity', re.I)])
    ticket_column = _get_column(headers, [re.compile(r'number', re.I), re.compile(r'ticket', re.I), re.compile(r'case', re.I), re.compile(r'incident', re.I), re.compile(r'request', re.I), re.compile(r'^id$', re.I)])

    stale_tickets = [row for row in rows if (updated := _parse_date(row.get(updated_column))) and updated < three_days_ago]
    closed_tickets = [row for row in rows if _is_closed_state(row.get(state_column))]
    open_tickets = [row for row in rows if _is_open_state(row.get(state_column))]
    unassigned_tickets = [row for row in rows if _is_unassigned(row.get(assignee_column))]
    assigned_tickets = [row for row in rows if not _is_unassigned(row.get(assignee_column))]
    unassigned_by_type = {'req': 0, 'incident': 0, 'task': 0}
    for row in unassigned_tickets:
        unassigned_by_type[_ticket_type(row, ticket_column, description_column)] += 1

    high_priority_tickets = [row for row in rows if _is_high_priority(row.get(priority_column))]
    flagged_tickets = [row for row in rows if _is_flagged(row)]
    created_last_7_days = [row for row in rows if (opened := _parse_date(row.get(opened_column))) and opened >= seven_days_ago]
    closed_last_7_days = [row for row in rows if (closed := _parse_date(row.get(closed_column))) and closed >= seven_days_ago]
    missing_updated_tickets = [row for row in rows if not _parse_date(row.get(updated_column))]
    missing_opened_tickets = [row for row in rows if not _parse_date(row.get(opened_column))]

    oldest_open_rows = sorted(
        [row for row in open_tickets if _parse_date(row.get(opened_column))],
        key=lambda item: _parse_date(item.get(opened_column)),
    )

    oldest_tickets = [
        {
            'id': _normalize(row.get(ticket_column)) or _normalize(row.get(description_column)) or 'Untitled ticket',
            'openedAt': _normalize(row.get(opened_column)) or 'Unknown',
            'assignee': _normalize(row.get(assignee_column)) or 'Unassigned',
            'state': _normalize(row.get(state_column)) or 'Unknown',
        }
        for row in oldest_open_rows[:5]
    ]

    keyword_counts = {}
    blocked_keywords = set(get_keyword_settings().get('do_not_use_keywords') or [])
    for row in rows:
        tokens = re.findall(r'[a-z0-9]{3,}', _lower(row.get(description_column)))
        for token in tokens:
            if token in STOPWORDS or token in blocked_keywords:
                continue
            keyword_counts[token] = keyword_counts.get(token, 0) + 1
    keywords = [
        {'label': label, 'count': count}
        for label, count in sorted(keyword_counts.items(), key=lambda item: item[1], reverse=True)[:10]
    ]

    overview = {
        'total': len(rows),
        'assigned': len(assigned_tickets),
        'open': len(open_tickets),
        'flagged': len(flagged_tickets),
        'visible_columns': len(headers),
        'stale': len(stale_tickets),
        'unassigned': len(unassigned_tickets),
        'high_priority': len(high_priority_tickets),
        'created_last_7_days': len(created_last_7_days),
        'closed_last_7_days': len(closed_last_7_days),
    }
    activity = {
        'state_distribution': [
            {
                **item,
                'items': _ticket_items(
                    [row for row in rows if (_normalize(row.get(state_column)) or 'Unknown') == item['label']],
                    ticket_column=ticket_column,
                    state_column=state_column,
                    assignee_column=assignee_column,
                    opened_column=opened_column,
                    description_column=description_column,
                    priority_column=priority_column,
                ),
            }
            for item in _count_by(rows, lambda row: _normalize(row.get(state_column)) or 'Unknown')
        ],
        'oldest_tickets': oldest_tickets,
        'oldest_ticket_items': _ticket_items(
            oldest_open_rows,
            ticket_column=ticket_column,
            state_column=state_column,
            assignee_column=assignee_column,
            opened_column=opened_column,
            description_column=description_column,
            priority_column=priority_column,
        ),
    }
    ownership = {
        'most_active_assignees': [
            {
                **item,
                'items': _ticket_items(
                    [row for row in assigned_tickets if _normalize(row.get(assignee_column)) == item['label']],
                    ticket_column=ticket_column,
                    state_column=state_column,
                    assignee_column=assignee_column,
                    opened_column=opened_column,
                    description_column=description_column,
                    priority_column=priority_column,
                ),
            }
            for item in _count_by(assigned_tickets, lambda row: _normalize(row.get(assignee_column)))
        ],
        'closed_by_assignee': [
            {
                **item,
                'items': _ticket_items(
                    [row for row in closed_tickets if not _is_unassigned(row.get(assignee_column)) and _normalize(row.get(assignee_column)) == item['label']],
                    ticket_column=ticket_column,
                    state_column=state_column,
                    assignee_column=assignee_column,
                    opened_column=opened_column,
                    description_column=description_column,
                    priority_column=priority_column,
                ),
            }
            for item in _count_by(
                [row for row in closed_tickets if not _is_unassigned(row.get(assignee_column))],
                lambda row: _normalize(row.get(assignee_column)),
            )
        ],
        'unassigned_count': len(unassigned_tickets),
        'unassigned': unassigned_by_type,
        'unassigned_items': _ticket_items(
            unassigned_tickets,
            ticket_column=ticket_column,
            state_column=state_column,
            assignee_column=assignee_column,
            opened_column=opened_column,
            description_column=description_column,
            priority_column=priority_column,
        ),
        'assignee_workload': {
            item['label']: item['count']
            for item in _count_by(assigned_tickets, lambda row: _normalize(row.get(assignee_column)))
        },
        'workload': {
            item['label']: item['count']
            for item in _count_by(assigned_tickets, lambda row: _normalize(row.get(assignee_column)))
        },
    }
    keyword_items = {
        keyword['label']: _ticket_items(
            [row for row in rows if re.search(rf'\b{re.escape(keyword["label"])}\b', _lower(row.get(description_column)))],
            ticket_column=ticket_column,
            state_column=state_column,
            assignee_column=assignee_column,
            opened_column=opened_column,
            description_column=description_column,
            priority_column=priority_column,
        )
        for keyword in keywords
    }
    data_quality = {
        'missing_fields': [
            {
                **_metric('Missing Assignee', len(unassigned_tickets), assignee_column or 'No assignee column'),
                'items': _ticket_items(unassigned_tickets, ticket_column=ticket_column, state_column=state_column, assignee_column=assignee_column, opened_column=opened_column, description_column=description_column, priority_column=priority_column),
            },
            {
                **_metric('Missing Updated Date', len(missing_updated_tickets), updated_column or 'No updated column'),
                'items': _ticket_items(missing_updated_tickets, ticket_column=ticket_column, state_column=state_column, assignee_column=assignee_column, opened_column=opened_column, description_column=description_column, priority_column=priority_column),
            },
            {
                **_metric('Missing Opened Date', len(missing_opened_tickets), opened_column or 'No opened column'),
                'items': _ticket_items(missing_opened_tickets, ticket_column=ticket_column, state_column=state_column, assignee_column=assignee_column, opened_column=opened_column, description_column=description_column, priority_column=priority_column),
            },
        ],
        'keywords': [{**keyword, 'items': keyword_items.get(keyword['label'], [])} for keyword in keywords],
    }
    summary_metrics = [
        {**_metric('Total Tickets', len(rows), 'Rows loaded'), 'items': _ticket_items(rows, ticket_column=ticket_column, state_column=state_column, assignee_column=assignee_column, opened_column=opened_column, description_column=description_column, priority_column=priority_column)},
        {**_metric('Stale Tickets', len(stale_tickets), _percent(len(stale_tickets), len(rows))), 'items': _ticket_items(stale_tickets, ticket_column=ticket_column, state_column=state_column, assignee_column=assignee_column, opened_column=opened_column, description_column=description_column, priority_column=priority_column)},
        {**_metric('Unassigned', len(unassigned_tickets), _percent(len(unassigned_tickets), len(rows))), 'items': _ticket_items(unassigned_tickets, ticket_column=ticket_column, state_column=state_column, assignee_column=assignee_column, opened_column=opened_column, description_column=description_column, priority_column=priority_column)},
        {**_metric('High Priority', len(high_priority_tickets), _percent(len(high_priority_tickets), len(rows))), 'items': _ticket_items(high_priority_tickets, ticket_column=ticket_column, state_column=state_column, assignee_column=assignee_column, opened_column=opened_column, description_column=description_column, priority_column=priority_column)},
        {**_metric('Created Last 7 Days', len(created_last_7_days), 'Recent intake'), 'items': _ticket_items(created_last_7_days, ticket_column=ticket_column, state_column=state_column, assignee_column=assignee_column, opened_column=opened_column, description_column=description_column, priority_column=priority_column)},
        {**_metric('Closed Last 7 Days', len(closed_last_7_days), 'Recent resolution'), 'items': _ticket_items(closed_last_7_days, ticket_column=ticket_column, state_column=state_column, assignee_column=assignee_column, opened_column=opened_column, description_column=description_column, priority_column=priority_column)},
    ]

    ai_summary = _build_ai_summary(overview, activity, ownership)
    return {
        'overview': overview,
        'activity': activity,
        'ownership': ownership,
        'workload': ownership['workload'],
        'unassigned': unassigned_by_type,
        'data_quality': data_quality,
        'ai_evaluation_input': {
            'totalTickets': len(rows),
            'assignedTickets': len(assigned_tickets),
            'unassignedTickets': len(unassigned_tickets),
            'assigneeWorkload': ownership['assignee_workload'],
            'unassignedByType': unassigned_by_type,
        },
        'ai_summary': ai_summary,
        'updated_at': now.isoformat(),
        'columns': {
            'state': state_column,
            'assignee': assignee_column,
            'updated': updated_column,
            'opened': opened_column,
            'closed': closed_column,
            'description': description_column,
            'priority': priority_column,
            'ticket': ticket_column,
        },
        'settings': {
            'do_not_use_keywords': sorted(blocked_keywords),
        },
        # Compatibility keys keep existing consumers from losing metrics while views migrate.
        'summaryMetrics': summary_metrics,
        'stateBreakdown': activity['state_distribution'],
        'closedByAssignee': ownership['closed_by_assignee'],
        'activeAssignees': ownership['most_active_assignees'],
        'oldestOpenTickets': oldest_tickets,
        'keywords': keywords,
        'dataQuality': data_quality['missing_fields'],
    }

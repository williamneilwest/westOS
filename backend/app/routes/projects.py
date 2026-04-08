from datetime import UTC, datetime

from flask import Blueprint, current_app, request

from ..api_response import error_response, success_response
from ..db import db
from ..models import Project, Task


projects_bp = Blueprint('projects', __name__)


def _projects_last_updated() -> str:
    last = db.session.query(db.func.max(Project.updated_at)).scalar()
    if isinstance(last, datetime):
        return last.replace(tzinfo=UTC).isoformat()
    return datetime.now(UTC).isoformat()


def generate_example_projects() -> list[dict[str, object]]:
    return [
        {
            'name': 'Ticket Dashboard System',
            'description': 'Operational dashboard for stale ticket visibility and SLA tracking.',
            'type': 'example',
            'tags': ['dashboard', 'tickets', 'sla', 'flask', 'react'],
            'tasks': [
                {
                    'title': 'Build ticket summary endpoints',
                    'description': 'Created aggregate endpoints for ticket counts and SLA buckets.',
                    'details': 'Implemented Flask routes that group tickets by status, owner, and SLA window. Added SQL aggregation for fast counts and stale ticket metrics. This reduced frontend polling payload size and improved dashboard responsiveness.',
                    'status': 'completed',
                    'priority': 'high',
                    'category': 'Backend',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
                {
                    'title': 'Create dashboard board layout',
                    'description': 'Built responsive React card layout for ticket KPIs.',
                    'details': 'Used React with reusable card components to display open, aging, and blocked ticket counts. Added mobile-first breakpoints to avoid horizontal scrolling on small screens. The layout now presents critical ticket status at a glance.',
                    'status': 'completed',
                    'priority': 'medium',
                    'category': 'Frontend',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
                {
                    'title': 'Wire API polling and caching',
                    'description': 'Connected dashboard widgets to live backend metrics.',
                    'details': 'Integrated API calls through shared client helpers and normalized payload handling. Added query caching to reduce duplicate requests and lower render jitter. Users now receive near-real-time ticket health updates with stable UI behavior.',
                    'status': 'completed',
                    'priority': 'high',
                    'category': 'Integration',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
                {
                    'title': 'Add stale ticket highlighting',
                    'description': 'Implemented stale detection and priority color signals.',
                    'details': 'Added stale thresholds in Flask and surfaced stale flags in React table rows. Applied semantic color badges and escalation markers for overdue tickets. The update improved triage speed for aging incidents.',
                    'status': 'completed',
                    'priority': 'medium',
                    'category': 'Frontend',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
                {
                    'title': 'Optimize query performance',
                    'description': 'Reduced dashboard load time through query tuning.',
                    'details': 'Refined SQL filters and ensured indexed columns were used in API queries. Added lightweight payload shaping so only required fields are returned. Dashboard initial load and refresh times improved noticeably under larger datasets.',
                    'status': 'completed',
                    'priority': 'high',
                    'category': 'Optimization',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
                {
                    'title': 'Validate role-based visibility',
                    'description': 'Ensured users see only authorized ticket data.',
                    'details': 'Applied permission checks in Flask middleware before ticket queries execute. Propagated role claims from auth context into API filters. This closed data-leak risks while preserving dashboard usability for each team.',
                    'status': 'completed',
                    'priority': 'high',
                    'category': 'Integration',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
            ],
        },
        {
            'name': 'Power Automate Integration',
            'description': 'Bi-directional workflow handoff between Life OS and Power Automate.',
            'type': 'example',
            'tags': ['automation', 'power-automate', 'integration'],
            'tasks': [
                {
                    'title': 'Create webhook intake route',
                    'description': 'Added Flask endpoint to receive flow events.',
                    'details': 'Implemented a signed webhook endpoint in Flask for Power Automate callbacks. Added schema validation and idempotency guards to prevent duplicate event processing. Incoming automations now land safely in the platform event stream.',
                    'status': 'completed',
                    'priority': 'high',
                    'category': 'Backend',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
                {
                    'title': 'Map flow payloads to internal models',
                    'description': 'Translated external JSON payloads into project/task records.',
                    'details': 'Built a transformation layer that normalizes Power Automate payloads to existing Flask SQLAlchemy models. Added fallback mappings for optional fields and malformed records. This reduced integration failures and kept downstream logic consistent.',
                    'status': 'completed',
                    'priority': 'high',
                    'category': 'Integration',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
                {
                    'title': 'Expose outbound trigger endpoint',
                    'description': 'Enabled app actions to start external automations.',
                    'details': 'Created an authenticated API route that posts event payloads to Power Automate HTTP triggers. Added retry handling with structured error logging for failed calls. Teams can now launch flows directly from app actions.',
                    'status': 'completed',
                    'priority': 'medium',
                    'category': 'Backend',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
                {
                    'title': 'Build integration health UI',
                    'description': 'Added frontend status panel for flow health and failures.',
                    'details': 'Implemented React status cards showing last sync time, delivery failures, and active connectors. Connected components to Flask health endpoints using shared API clients. Operators can now detect and diagnose failing automations quickly.',
                    'status': 'completed',
                    'priority': 'medium',
                    'category': 'Frontend',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
                {
                    'title': 'Add event deduplication cache',
                    'description': 'Prevented duplicate event handling from retried webhooks.',
                    'details': 'Stored event fingerprints and TTL windows before processing inbound webhook payloads. Flask now skips duplicate events while preserving trace logs for auditing. This eliminated noisy duplicate project updates from flow retries.',
                    'status': 'completed',
                    'priority': 'high',
                    'category': 'Optimization',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
                {
                    'title': 'Document integration contract',
                    'description': 'Published payload contract and error semantics.',
                    'details': 'Created internal docs that define request schemas, auth headers, and expected status codes. Linked examples for common workflow patterns and failure handling. The integration became easier to maintain and onboard to.',
                    'status': 'completed',
                    'priority': 'low',
                    'category': 'Integration',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
            ],
        },
        {
            'name': 'Script Runner (PowerShell Execution)',
            'description': 'Secure execution pipeline for scripted operational tasks.',
            'type': 'example',
            'tags': ['scripts', 'powershell', 'operations'],
            'tasks': [
                {
                    'title': 'Design script metadata schema',
                    'description': 'Created schema for scripts, arguments, and execution history.',
                    'details': 'Added Flask model attributes for script title, command body, and runtime metadata. Stored execution context so each run can be audited and replayed. This gave the script module a stable backend contract.',
                    'status': 'completed',
                    'priority': 'medium',
                    'category': 'Backend',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
                {
                    'title': 'Implement script execution endpoint',
                    'description': 'Added API route to execute approved PowerShell scripts.',
                    'details': 'Built a guarded Flask execution endpoint that validates script IDs and runtime parameters. Captured stdout/stderr and persisted run status for each invocation. Operators can now run automation scripts from the app without shell access.',
                    'status': 'completed',
                    'priority': 'high',
                    'category': 'Backend',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
                {
                    'title': 'Build run history timeline UI',
                    'description': 'Created React view of execution logs and outcomes.',
                    'details': 'Implemented a timeline component showing run states, duration, and output previews. Added row expansion to inspect command output details. This improved troubleshooting speed when scripts fail in production.',
                    'status': 'completed',
                    'priority': 'medium',
                    'category': 'Frontend',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
                {
                    'title': 'Integrate role-based execution control',
                    'description': 'Restricted script execution by user role.',
                    'details': 'Wired auth claims into execution checks so only permitted roles can run high-impact scripts. Added API error messages that explain missing permissions clearly. The integration reduced accidental privileged script runs.',
                    'status': 'completed',
                    'priority': 'high',
                    'category': 'Integration',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
                {
                    'title': 'Add execution timeout safeguards',
                    'description': 'Prevented runaway script sessions from hanging workers.',
                    'details': 'Introduced configurable timeout windows and cancellation handling around script invocation. Recorded timeout metrics for monitoring and alerting. System stability improved by preventing long-running tasks from blocking service capacity.',
                    'status': 'completed',
                    'priority': 'high',
                    'category': 'Optimization',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
                {
                    'title': 'Create script templates library',
                    'description': 'Provided reusable templates for common maintenance tasks.',
                    'details': 'Added starter templates and parameter presets in the React script editor experience. Linked template metadata to backend script creation routes. Users can now launch common maintenance workflows faster with fewer manual edits.',
                    'status': 'completed',
                    'priority': 'low',
                    'category': 'Frontend',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
            ],
        },
        {
            'name': 'CSV Upload + Processing',
            'description': 'Structured ingest pipeline for CSV imports and normalized records.',
            'type': 'example',
            'tags': ['csv', 'upload', 'processing', 'etl'],
            'tasks': [
                {
                    'title': 'Add upload endpoint with validation',
                    'description': 'Created Flask upload route and CSV schema checks.',
                    'details': 'Implemented multipart upload handling and MIME validation for CSV files. Added column-level checks before records are accepted into processing. Invalid files now fail early with clear API error messages.',
                    'status': 'completed',
                    'priority': 'high',
                    'category': 'Backend',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
                {
                    'title': 'Implement row parsing pipeline',
                    'description': 'Parsed CSV rows into typed internal payloads.',
                    'details': 'Built a parsing layer that trims values, normalizes dates, and maps rows to SQLAlchemy models. Added rejection reporting for malformed entries with line-level context. This produced consistent records for downstream APIs.',
                    'status': 'completed',
                    'priority': 'high',
                    'category': 'Integration',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
                {
                    'title': 'Build frontend upload workflow',
                    'description': 'Created drag-and-drop upload and progress feedback UI.',
                    'details': 'Implemented React upload controls with progress, completion, and error states. Connected the UI to Flask upload endpoints via shared API helpers. Users now get immediate visibility into import success and failures.',
                    'status': 'completed',
                    'priority': 'medium',
                    'category': 'Frontend',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
                {
                    'title': 'Add duplicate record detection',
                    'description': 'Prevented duplicate imports across recurring files.',
                    'details': 'Introduced deterministic keys derived from CSV business fields before database writes. Duplicate rows are now skipped and reported in import summaries. This avoided inflated metrics from repeated uploads.',
                    'status': 'completed',
                    'priority': 'medium',
                    'category': 'Optimization',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
                {
                    'title': 'Create import results dashboard',
                    'description': 'Displayed processed row counts and validation errors.',
                    'details': 'Added React result cards for accepted rows, rejected rows, and duplicate counts. Pulled aggregate data from Flask processing summaries after each upload. Teams can now verify ingest quality without checking raw logs.',
                    'status': 'completed',
                    'priority': 'low',
                    'category': 'Frontend',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
                {
                    'title': 'Optimize large-file processing',
                    'description': 'Improved throughput for larger CSV imports.',
                    'details': 'Processed CSV records in chunks and committed in controlled batches to reduce memory pressure. Added timing metrics around parsing and DB writes to spot bottlenecks. Import reliability improved for high-volume data drops.',
                    'status': 'completed',
                    'priority': 'high',
                    'category': 'Optimization',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
            ],
        },
        {
            'name': 'Homelab Service Dashboard',
            'description': 'Centralized status, uptime, and endpoint controls for homelab services.',
            'type': 'example',
            'tags': ['homelab', 'dashboard', 'monitoring'],
            'tasks': [
                {
                    'title': 'Create service status model',
                    'description': 'Defined backend schema for service health and uptime.',
                    'details': 'Added SQLAlchemy model fields for endpoint, health, and uptime metrics. Exposed normalized status values through Flask APIs for consistent rendering. This established a clean source of truth for service monitoring.',
                    'status': 'completed',
                    'priority': 'medium',
                    'category': 'Backend',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
                {
                    'title': 'Implement status polling API',
                    'description': 'Built backend checks to refresh service health data.',
                    'details': 'Created periodic health check logic that probes configured homelab endpoints and updates stored status. Added retry and timeout controls to prevent noisy failures. Operators now see fresher and more reliable service health snapshots.',
                    'status': 'completed',
                    'priority': 'high',
                    'category': 'Integration',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
                {
                    'title': 'Design homelab service cards',
                    'description': 'Built React cards for service overview and actions.',
                    'details': 'Implemented responsive cards with uptime, endpoint, and quick-action links. Used status color accents and badges to make unhealthy services obvious. The dashboard now provides faster at-a-glance operational awareness.',
                    'status': 'completed',
                    'priority': 'medium',
                    'category': 'Frontend',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
                {
                    'title': 'Add service endpoint quick-launch',
                    'description': 'Enabled one-click access to service URLs.',
                    'details': 'Connected React card actions to validated endpoint URLs from Flask responses. Added target-safe behavior for opening service tools in new tabs. This reduced navigation friction while managing multiple homelab apps.',
                    'status': 'completed',
                    'priority': 'low',
                    'category': 'Integration',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
                {
                    'title': 'Optimize dashboard refresh cycles',
                    'description': 'Balanced freshness with API load on status checks.',
                    'details': 'Tuned refresh intervals and batched status updates to limit unnecessary traffic. Applied lightweight caching and stale indicators in the React layer. The dashboard stayed responsive while reducing backend load.',
                    'status': 'completed',
                    'priority': 'high',
                    'category': 'Optimization',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
                {
                    'title': 'Improve mobile dashboard density',
                    'description': 'Adapted service card layout for small screens.',
                    'details': 'Refined spacing, typography, and action placement for narrow viewports in React. Removed overflow-prone elements and ensured cards wrap cleanly. Mobile homelab monitoring became usable without horizontal scroll.',
                    'status': 'completed',
                    'priority': 'medium',
                    'category': 'Frontend',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
            ],
        },
        {
            'name': 'Authentication / API Integration',
            'description': 'Unified auth and protected API access across modules.',
            'type': 'example',
            'tags': ['auth', 'security', 'api'],
            'tasks': [
                {
                    'title': 'Implement token validation middleware',
                    'description': 'Added backend guard for protected routes.',
                    'details': 'Built Flask middleware to validate bearer tokens and attach user context to requests. Added rejection handling for expired and malformed tokens. Protected routes now enforce authentication consistently.',
                    'status': 'completed',
                    'priority': 'high',
                    'category': 'Backend',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
                {
                    'title': 'Create login session flow',
                    'description': 'Integrated frontend login and secure session persistence.',
                    'details': 'Built React auth flow that stores session context and refreshes protected data after login. Connected UI state transitions to Flask auth endpoints via shared API helpers. Users now authenticate once and retain secure access across modules.',
                    'status': 'completed',
                    'priority': 'high',
                    'category': 'Frontend',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
                {
                    'title': 'Add API client auth interceptors',
                    'description': 'Automatically handled auth headers and unauthorized responses.',
                    'details': 'Extended API client logic to attach credentials and centralize 401/403 handling. Added silent revalidation behavior where supported by backend endpoints. This reduced duplicated auth code in React modules.',
                    'status': 'completed',
                    'priority': 'medium',
                    'category': 'Integration',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
                {
                    'title': 'Enable role-based UI controls',
                    'description': 'Conditionally rendered actions based on user roles.',
                    'details': 'Mapped backend role claims to frontend permission checks for sensitive actions. Added guarded components to hide unavailable controls while preserving layout consistency. This improved security posture and user clarity.',
                    'status': 'completed',
                    'priority': 'medium',
                    'category': 'Frontend',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
                {
                    'title': 'Harden auth error telemetry',
                    'description': 'Added structured logging for auth and API failures.',
                    'details': 'Captured auth failure reason codes and request identifiers in backend logs. Exposed aggregate failure stats for troubleshooting integration regressions. Faster diagnostics reduced downtime when identity issues surfaced.',
                    'status': 'completed',
                    'priority': 'medium',
                    'category': 'Optimization',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
                {
                    'title': 'Write auth integration tests',
                    'description': 'Validated login, token checks, and protected route behavior.',
                    'details': 'Added route-level tests for authentication success and failure paths in Flask. Verified frontend auth hooks with mocked API responses for guarded screens. This reduced release risk for future auth changes.',
                    'status': 'completed',
                    'priority': 'low',
                    'category': 'Backend',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
            ],
        },
        {
            'name': 'Mobile UI Optimization',
            'description': 'Mobile-first polish pass across project and task workflows.',
            'type': 'example',
            'tags': ['mobile', 'ui', 'responsive', 'ux'],
            'tasks': [
                {
                    'title': 'Audit breakpoints and overflow issues',
                    'description': 'Identified layout regressions causing mobile horizontal scroll.',
                    'details': 'Ran a component audit across React pages and recorded elements exceeding viewport bounds. Added baseline overflow protections and width constraints at key breakpoints. The app no longer introduces horizontal scrolling in common flows.',
                    'status': 'completed',
                    'priority': 'high',
                    'category': 'Optimization',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
                {
                    'title': 'Refactor cards for narrow screens',
                    'description': 'Adjusted card spacing and typography for mobile readability.',
                    'details': 'Updated card padding, heading scale, and tag wrapping behavior in React components. Ensured content density stays readable without truncation on small devices. Users can review project and task data comfortably on phones.',
                    'status': 'completed',
                    'priority': 'medium',
                    'category': 'Frontend',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
                {
                    'title': 'Optimize touch interactions',
                    'description': 'Improved tap targets and gesture-safe control spacing.',
                    'details': 'Increased tap target sizes and spacing for primary actions across forms and lists. Reduced accidental taps by separating destructive actions from navigation controls. Mobile interaction reliability improved during frequent task updates.',
                    'status': 'completed',
                    'priority': 'medium',
                    'category': 'Frontend',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
                {
                    'title': 'Reduce API payload for mobile clients',
                    'description': 'Shaped backend responses to minimize cellular data usage.',
                    'details': 'Added lightweight response variants in Flask for list screens that only need summary fields. Deferred full detail payloads to on-demand API requests. Mobile page loads became faster and less bandwidth intensive.',
                    'status': 'completed',
                    'priority': 'high',
                    'category': 'Backend',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
                {
                    'title': 'Integrate viewport-aware animations',
                    'description': 'Added subtle transitions that perform well on mobile.',
                    'details': 'Implemented lightweight CSS transitions for expand/collapse and card state changes in React. Kept animation durations short to avoid jank on lower-power devices. The UI now feels smoother without sacrificing responsiveness.',
                    'status': 'completed',
                    'priority': 'low',
                    'category': 'Integration',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
                {
                    'title': 'Run mobile regression pass',
                    'description': 'Validated key flows on representative viewport sizes.',
                    'details': 'Executed a focused QA checklist covering project boards, task updates, and modal flows. Logged and fixed visual defects found during small-screen verification. Release confidence improved for mobile-heavy usage patterns.',
                    'status': 'completed',
                    'priority': 'medium',
                    'category': 'Optimization',
                    'depends_on': [],
                    'auto_complete_rule': None,
                },
            ],
        },
    ]


def _serialize_example_projects() -> list[dict[str, object]]:
    projects = Project.query.filter_by(type='example').order_by(Project.name.asc()).all()
    if not projects:
        return []

    project_ids = [project.id for project in projects]
    tasks = Task.query.filter(Task.project_id.in_(project_ids)).order_by(Task.id.asc()).all()
    tasks_by_project: dict[str, list[dict[str, object]]] = {}
    for task in tasks:
        if not task.project_id:
            continue
        tasks_by_project.setdefault(task.project_id, []).append(task.to_dict())

    return [{**project.to_dict(), 'tasks': tasks_by_project.get(project.id, [])} for project in projects]


@projects_bp.get('/projects/examples', strict_slashes=False)
def get_or_create_example_projects():
    example_projects = generate_example_projects()

    existing_projects = {
        project.name: project
        for project in Project.query.filter(Project.type == 'example').all()
    }

    created = False

    for project_payload in example_projects:
        project_name = str(project_payload['name'])
        project = existing_projects.get(project_name)

        if project is None:
            project = Project(
                name=project_name,
                description=str(project_payload.get('description') or ''),
                type='example',
                status='Complete',
                notes='Auto-generated example workflow',
                tags=list(project_payload.get('tags') or []),
            )
            db.session.add(project)
            db.session.flush()
            existing_projects[project_name] = project
            created = True

        existing_titles = {
            title
            for (title,) in db.session.query(Task.title).filter(Task.project_id == project.id).all()
        }

        for task_payload in list(project_payload.get('tasks') or []):
            task_title = str(task_payload.get('title') or '').strip()
            if not task_title or task_title in existing_titles:
                continue

            task = Task(
                title=task_title,
                description=str(task_payload.get('description') or ''),
                details=str(task_payload.get('details') or ''),
                completed=True,
                due_date=None,
                priority=str(task_payload.get('priority') or 'medium'),
                status='completed',
                category=str(task_payload.get('category') or 'General'),
                depends_on=list(task_payload.get('depends_on') or []),
                auto_complete_rule=(
                    str(task_payload.get('auto_complete_rule')).strip()
                    if task_payload.get('auto_complete_rule')
                    else None
                ),
                notes='Completed during example build',
                project_id=project.id,
            )
            db.session.add(task)
            existing_titles.add(task_title)
            created = True

    if created:
        db.session.commit()

    return success_response({'data': _serialize_example_projects(), 'lastUpdated': _projects_last_updated()})


@projects_bp.get('/projects/', strict_slashes=False)
def get_projects():
    current_app.logger.info('[DB] Fetching table: projects')
    projects = Project.query.order_by(Project.updated_at.desc()).all()
    current_app.logger.info('[DB] projects rows returned: %s', len(projects))
    return success_response({'data': [project.to_dict() for project in projects], 'lastUpdated': _projects_last_updated()})


@projects_bp.get('/projects/last-updated', strict_slashes=False)
def get_projects_last_updated():
    return success_response({'lastUpdated': _projects_last_updated()})


@projects_bp.get('/projects/<string:project_id>', strict_slashes=False)
def get_project_by_id(project_id: str):
    project = Project.query.get_or_404(project_id)
    return success_response(project.to_dict())


@projects_bp.post('/projects/', strict_slashes=False)
def create_project():
    data = request.get_json(silent=True) or {}
    name = str(data.get('name', '')).strip()

    if not name:
        return error_response('name is required', 400)

    project = Project(
        id=str(data.get('id') or '').strip() or None,
        name=name,
        description=str(data.get('description') or ''),
        type=str(data.get('type') or 'custom'),
        status=str(data.get('status') or 'Backlog'),
        notes=str(data.get('notes') or ''),
        link=str(data.get('link')).strip() if data.get('link') else None,
        tags=list(data.get('tags') or []),
    )

    db.session.add(project)
    db.session.commit()
    return success_response(project.to_dict(), 201)


@projects_bp.patch('/projects/<string:project_id>', strict_slashes=False)
def update_project(project_id: str):
    data = request.get_json(silent=True) or {}
    project = Project.query.get_or_404(project_id)

    if 'name' in data:
        name = str(data.get('name') or '').strip()
        if not name:
            return error_response('name cannot be empty', 400)
        project.name = name

    if 'status' in data:
        project.status = str(data.get('status') or project.status)
    if 'description' in data:
        project.description = str(data.get('description') or '')
    if 'type' in data:
        project.type = str(data.get('type') or 'custom')
    if 'notes' in data:
        project.notes = str(data.get('notes') or '')
    if 'link' in data:
        project.link = str(data.get('link')).strip() if data.get('link') else None
    if 'tags' in data:
        project.tags = list(data.get('tags') or [])

    db.session.commit()
    return success_response(project.to_dict())


@projects_bp.delete('/projects/<string:project_id>', strict_slashes=False)
def delete_project(project_id: str):
    project = Project.query.get_or_404(project_id)
    db.session.delete(project)
    db.session.commit()
    return success_response({'deleted': True})

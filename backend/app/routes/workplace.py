from __future__ import annotations

from datetime import UTC, datetime
import subprocess
from typing import Any

from flask import Blueprint, current_app, request

from ..api_response import error_response, success_response


workplace_bp = Blueprint('workplace', __name__)

WORKPLACE_SCRIPTS: list[dict[str, str]] = [
    {
        'id': 'restart-print-spooler',
        'name': 'Restart Print Spooler',
        'description': 'Restarts the print spooler workflow.',
        'copyCommand': 'Restart-Service Spooler',
        'command': "printf 'Simulated: Restarted Print Spooler\\n'",
    },
    {
        'id': 'flush-dns',
        'name': 'Flush DNS',
        'description': 'Flushes DNS resolver cache.',
        'copyCommand': 'ipconfig /flushdns',
        'command': "printf 'Simulated: DNS cache flushed\\n'",
    },
    {
        'id': 'map-network-drive',
        'name': 'Map Network Drive',
        'description': 'Maps a common network drive path for IT support.',
        'copyCommand': 'net use Z: \\\\fileserver\\it',
        'command': "printf 'Simulated: Mapped Z: to \\\\fileserver\\\\it\\n'",
    },
    {
        'id': 'restart-explorer',
        'name': 'Restart Explorer',
        'description': 'Restarts shell experience to recover stuck UI.',
        'copyCommand': 'taskkill /f /im explorer.exe && start explorer.exe',
        'command': "printf 'Simulated: Explorer restarted\\n'",
    },
]

WORKPLACE_LINKS: list[dict[str, str]] = [
    {'id': 'servicenow', 'label': 'ServiceNow', 'url': 'https://www.servicenow.com', 'icon': 'LifeBuoy'},
    {'id': 'sharepoint-itss', 'label': 'SharePoint ITSS', 'url': 'https://www.microsoft.com/microsoft-365/sharepoint/collaboration', 'icon': 'Network'},
    {'id': 'power-apps', 'label': 'Power Apps', 'url': 'https://make.powerapps.com', 'icon': 'Zap'},
    {'id': 'azure-portal', 'label': 'Azure Portal', 'url': 'https://portal.azure.com', 'icon': 'Cloud'},
    {'id': 'admin-dashboards', 'label': 'Admin Dashboards', 'url': 'https://admin.microsoft.com', 'icon': 'Shield'},
]


def _script_for_id(script_id: str) -> dict[str, str] | None:
    for script in WORKPLACE_SCRIPTS:
        if script['id'] == script_id:
            return script
    return None


def _execution_payload(script: dict[str, str], completed: subprocess.CompletedProcess[str], timeout_seconds: int) -> dict[str, Any]:
    return {
        'success': completed.returncode == 0,
        'scriptId': script['id'],
        'scriptName': script['name'],
        'output': completed.stdout or '',
        'error': completed.stderr or '',
        'returnCode': completed.returncode,
        'executedAt': datetime.now(UTC).isoformat(),
        'timeoutSeconds': timeout_seconds,
    }


@workplace_bp.get('/workplace/scripts', strict_slashes=False)
def get_workplace_scripts():
    scripts = [
        {
            'id': script['id'],
            'name': script['name'],
            'description': script['description'],
            'copyCommand': script['copyCommand'],
        }
        for script in WORKPLACE_SCRIPTS
    ]
    return success_response({'scripts': scripts})


@workplace_bp.get('/workplace/links', strict_slashes=False)
def get_workplace_links():
    return success_response({'links': WORKPLACE_LINKS})


@workplace_bp.post('/workplace/run-script', strict_slashes=False)
def run_workplace_script():
    payload = request.get_json(silent=True) or {}
    script_id = str(payload.get('scriptId') or '').strip()
    if not script_id:
        return error_response('scriptId is required', 400)

    script = _script_for_id(script_id)
    if not script:
        return error_response('Script not found', 404)

    timeout_seconds = 15
    try:
        completed = subprocess.run(
            script['command'],
            shell=True,
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
            cwd='/app',
        )
        result = _execution_payload(script, completed, timeout_seconds)
        current_app.logger.info(
            '[WORKPLACE] script=%s success=%s return_code=%s',
            script['id'],
            result['success'],
            result['returnCode'],
        )
        return success_response(result, 200 if result['success'] else 500)
    except subprocess.TimeoutExpired:
        current_app.logger.warning('[WORKPLACE] script=%s timed out after %ss', script['id'], timeout_seconds)
        return error_response(f'Script timed out after {timeout_seconds} seconds', 504)
    except Exception as error:  # noqa: BLE001 - consistent API payload for runtime failures
        current_app.logger.exception('[WORKPLACE] script=%s failed: %s', script['id'], error)
        return error_response('Script execution failed', 500)

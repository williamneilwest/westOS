from __future__ import annotations

import os

import requests

from .flow_router import route_flow_result
from .flow_runs import track_flow_run
from .group_lookup import (
    DEFAULT_SCRIPT_NAME,
    DEFAULT_TIMEOUT_SECONDS,
    DEFAULT_USER_GROUPS_SCRIPT_NAME,
)


def _base_flow_url() -> str:
    return os.getenv('POWER_AUTOMATE_GROUP_SEARCH_URL', '').strip()


def get_registered_flows():
    return [
        {
            'name': 'Search Groups',
            'script_name': os.getenv('POWER_AUTOMATE_GROUP_SCRIPT_NAME', DEFAULT_SCRIPT_NAME).strip() or DEFAULT_SCRIPT_NAME,
            'description': 'Looks up group records by search text.',
            'required_variables': ['searchText'],
            'url_configured': bool(_base_flow_url()),
        },
        {
            'name': 'Get User Groups',
            'script_name': os.getenv('POWER_AUTOMATE_USER_GROUPS_SCRIPT_NAME', DEFAULT_USER_GROUPS_SCRIPT_NAME).strip() or DEFAULT_USER_GROUPS_SCRIPT_NAME,
            'description': 'Returns group memberships for a user OPID.',
            'required_variables': ['user_opid'],
            'url_configured': bool(_base_flow_url()),
        },
    ]


def run_registered_flow(flow_name: str, variables: dict | None, user_id: int | None):
    normalized_flow_name = str(flow_name or '').strip()
    variables_map = variables if isinstance(variables, dict) else {}
    flow_url = _base_flow_url()
    timeout = int(os.getenv('POWER_AUTOMATE_GROUP_TIMEOUT_SECONDS', str(DEFAULT_TIMEOUT_SECONDS)))
    if not flow_url:
        raise RuntimeError('POWER_AUTOMATE_GROUP_SEARCH_URL is not configured')

    registered = {flow['name']: flow for flow in get_registered_flows()}
    flow = registered.get(normalized_flow_name)
    if not flow:
        raise ValueError('Unknown flow name.')

    script_name = flow['script_name']
    payload = {
        'scriptName': script_name,
        'variables': variables_map,
    }

    def _execute():
        response = requests.post(
            flow_url,
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=timeout,
        )
        response.raise_for_status()
        try:
            parsed = response.json()
        except ValueError:
            parsed = {'raw': response.text or ''}
        route_flow_result(script_name, parsed)
        return {
            'flow_name': normalized_flow_name,
            'script_name': script_name,
            'response': parsed,
            'status_code': response.status_code,
        }

    return track_flow_run(
        normalized_flow_name,
        user_id,
        payload,
        _execute,
    )

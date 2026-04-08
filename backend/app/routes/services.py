from __future__ import annotations

from copy import deepcopy
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from flask import Blueprint

from ..api_response import success_response


services_bp = Blueprint('services', __name__)

SERVICES_CATEGORIES: list[dict[str, Any]] = [
    {
        'name': 'Infrastructure',
        'services': [
            {'name': 'Portainer', 'url': 'https://portainer.io', 'icon': 'server', 'description': 'Docker management', 'status': 'unknown', 'metadata': ['Docker', 'Ops']},
            {'name': 'Proxmox', 'url': 'https://www.proxmox.com', 'icon': 'database', 'description': 'Virtualization cluster', 'status': 'unknown', 'metadata': ['VMs', 'Cluster']},
            {'name': 'Uptime Kuma', 'url': 'https://github.com/louislam/uptime-kuma', 'icon': 'activity', 'description': 'Service monitoring', 'status': 'unknown', 'metadata': ['Monitor']},
        ],
    },
    {
        'name': 'Development',
        'services': [
            {'name': 'GitHub', 'url': 'https://github.com', 'icon': 'code', 'description': 'Source control and CI', 'status': 'unknown', 'metadata': ['SCM']},
            {'name': 'VS Code Server', 'url': 'https://code.visualstudio.com/docs/remote/vscode-server', 'icon': 'terminal', 'description': 'Remote development', 'status': 'unknown', 'metadata': ['IDE']},
        ],
    },
    {
        'name': 'Media',
        'services': [
            {'name': 'Plex', 'url': 'https://www.plex.tv', 'icon': 'film', 'description': 'Media streaming', 'status': 'unknown', 'metadata': ['Streaming']},
            {'name': 'Jellyfin', 'url': 'https://jellyfin.org', 'icon': 'tv', 'description': 'Open media server', 'status': 'unknown', 'metadata': ['Media']},
        ],
    },
    {
        'name': 'Smart Home',
        'services': [
            {'name': 'Home Assistant', 'url': 'https://www.home-assistant.io', 'icon': 'home', 'description': 'Home automation control', 'status': 'unknown', 'metadata': ['IoT']},
        ],
    },
    {
        'name': 'Personal',
        'services': [
            {'name': 'LifeOS', 'url': 'https://life.wnwest.com', 'icon': 'user', 'description': 'Personal operations system', 'status': 'unknown', 'metadata': ['Dashboard']},
            {'name': 'Notion', 'url': 'https://www.notion.so', 'icon': 'notebook', 'description': 'Knowledge and notes', 'status': 'unknown', 'metadata': ['Docs']},
        ],
    },
    {
        'name': 'Downloads',
        'services': [
            {'name': 'qBittorrent', 'url': 'https://www.qbittorrent.org', 'icon': 'download', 'description': 'Download management', 'status': 'unknown', 'metadata': ['Queue']},
        ],
    },
]


def _check_url_status(url: str, timeout_seconds: int = 3) -> str:
    try:
        head_request = Request(url, method='HEAD')
        with urlopen(head_request, timeout=timeout_seconds) as response:
            code = response.getcode()
            return 'online' if 200 <= code < 400 else 'offline'
    except HTTPError as error:
        return 'online' if 200 <= error.code < 400 else 'offline'
    except (URLError, TimeoutError, ValueError):
        return 'unknown'
    except Exception:
        return 'unknown'


@services_bp.get('/services', strict_slashes=False)
def get_services():
    return success_response({'categories': deepcopy(SERVICES_CATEGORIES)})


@services_bp.get('/services/status', strict_slashes=False)
def get_services_status():
    statuses: list[dict[str, str]] = []
    for category in SERVICES_CATEGORIES:
        category_name = str(category.get('name') or '')
        services = category.get('services') if isinstance(category.get('services'), list) else []
        for service in services:
            if not isinstance(service, dict):
                continue
            url = str(service.get('url') or '').strip()
            if not url:
                continue
            statuses.append(
                {
                    'category': category_name,
                    'name': str(service.get('name') or ''),
                    'url': url,
                    'status': _check_url_status(url),
                }
            )
    return success_response({'statuses': statuses})

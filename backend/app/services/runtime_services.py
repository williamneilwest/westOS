import subprocess
import re


SERVICE_URLS = {
    "backend": "https://westos.dev/health",
    "frontend": "https://westos.dev",
    "ui": "https://westos.dev",
    "ai-gateway": "https://westos.dev/api/ai/health",
    "caddy": "https://westos.dev",
    "homelab-grafana": "https://grafana.westos.dev",
    "grafana": "https://grafana.westos.app",
    "code-server": "https://code.westos.app",
    "portainer": "https://portainer.westos.dev",
    "filebrowser": "https://files.westos.dev",
    "open-webui": "https://webui.westos.dev",
    "homelab-plex": "https://plex.westos.app",
    "homelab-qbittorrent": "https://torrent.westos.app",
}


def normalize_health(status_text):
    normalized = str(status_text or "").strip().lower()
    if "up" not in normalized:
        return "down"
    if "unhealthy" in normalized:
        return "down"
    return "healthy"


def extract_primary_port(ports_text):
    match = re.search(r"(\d+)->", str(ports_text or ""))
    if match:
        return match.group(1)
    return ""


def resolve_service_url(name):
    normalized = str(name or "").strip().lower()
    if normalized in SERVICE_URLS:
        return SERVICE_URLS[normalized]
    return ""


def list_runtime_services():
    """Return Docker service runtime data used by multiple system endpoints."""
    try:
        result = subprocess.run(
            ["docker", "ps", "--format", "{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"],
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
    except (FileNotFoundError, OSError, subprocess.TimeoutExpired) as error:
        return {
            "status": "error",
            "message": str(error),
            "services": [],
        }

    if result.returncode != 0:
        message = (result.stderr or result.stdout or "").strip() or "Failed to list Docker services."
        return {
            "status": "error",
            "message": message,
            "services": [],
        }

    services = []
    for raw_line in (result.stdout or "").splitlines():
        parts = raw_line.split("\t")
        if not parts or not parts[0].strip():
            continue

        name = parts[0].strip()
        image = parts[1].strip() if len(parts) > 1 else ""
        status = parts[2].strip() if len(parts) > 2 else ""
        ports = parts[3].strip() if len(parts) > 3 else ""
        services.append(
            {
                "name": name,
                "container_name": name,
                "image": image,
                "status": status,
                "ports": ports,
                "port": extract_primary_port(ports),
                "health": normalize_health(status),
                "url": resolve_service_url(name),
            }
        )

    return {
        "status": "ok",
        "services": services,
    }

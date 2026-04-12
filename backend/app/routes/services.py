import subprocess

from flask import Blueprint, jsonify


services_bp = Blueprint("services", __name__)


def _normalize_health(status_text):
    normalized = str(status_text or "").strip().lower()
    if "up" not in normalized:
        return "down"
    if "unhealthy" in normalized:
        return "down"
    return "healthy"


@services_bp.get("/api/services")
def get_services():
    try:
        result = subprocess.run(
            ["docker", "ps", "--format", "{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"],
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
    except (FileNotFoundError, OSError, subprocess.TimeoutExpired) as error:
        return jsonify({"status": "error", "message": str(error), "services": []})

    if result.returncode != 0:
        message = (result.stderr or result.stdout or "").strip() or "Failed to list Docker services."
        return jsonify({"status": "error", "message": message, "services": []})

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
                "image": image,
                "status": status,
                "ports": ports,
                "health": _normalize_health(status),
            }
        )

    return jsonify({"status": "ok", "services": services})

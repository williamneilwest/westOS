import re
import subprocess

from flask import Blueprint, current_app, jsonify, request

from ..services.log_monitor import get_log_monitor


logs_bp = Blueprint("logs", __name__)

_VALID_SOURCES = {"docker"}
_CONTAINER_PATTERN = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$")


def _sanitize_tail(value):
    try:
        tail = int(value)
    except (TypeError, ValueError):
        tail = 200
    return max(1, min(tail, 2000))


def _list_running_containers():
    try:
        result = subprocess.run(
            ["docker", "ps", "--format", "{{.Names}}"],
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
    except FileNotFoundError:
        return None, "Docker CLI is not available in the backend runtime."
    except subprocess.TimeoutExpired:
        return None, "Timed out while listing Docker containers."
    except OSError as error:
        return None, f"Docker command failed: {error}"
    if result.returncode != 0:
        error = (result.stderr or result.stdout or "").strip() or "Failed to list Docker containers."
        return None, error

    containers = [line.strip() for line in (result.stdout or "").splitlines() if line.strip()]
    return containers, None


@logs_bp.get("/api/logs")
def get_logs():
    source = str(request.args.get("source") or "docker").strip().lower()
    container = str(request.args.get("container") or "").strip()
    tail = _sanitize_tail(request.args.get("tail", 200))

    if source not in _VALID_SOURCES:
        return jsonify({"error": "Unsupported source. Only docker is currently allowed."}), 400

    if source == "docker":
        available_containers, list_error = _list_running_containers()
        if list_error:
            return jsonify({"error": list_error}), 502

        if not container:
            return jsonify(
                {
                    "success": True,
                    "source": "docker",
                    "container": None,
                    "logs": "",
                    "availableContainers": available_containers or [],
                }
            )

        if not _CONTAINER_PATTERN.match(container):
            return jsonify({"error": "Invalid container name."}), 400

        if container not in (available_containers or []):
            return jsonify({"error": f"Container '{container}' was not found among running containers."}), 404

        try:
            result = subprocess.run(
                ["docker", "logs", "--tail", str(tail), container],
                capture_output=True,
                text=True,
                timeout=5,
                check=False,
            )
        except FileNotFoundError:
            return jsonify({"error": "Docker CLI is not available in the backend runtime."}), 503
        except subprocess.TimeoutExpired:
            return jsonify({"error": "Timed out while fetching Docker logs."}), 504
        except OSError as error:
            return jsonify({"error": f"Docker command failed: {error}"}), 502

        if result.returncode != 0:
            error_text = (result.stderr or result.stdout or "").strip().lower()
            if "no such container" in error_text:
                return jsonify({"error": f"Container '{container}' was not found."}), 404
            clean_error = (result.stderr or result.stdout or "").strip() or "Failed to fetch Docker logs."
            return jsonify({"error": clean_error}), 502

        logs_text = "\n".join([part for part in [result.stdout, result.stderr] if part]).strip()
        return jsonify(
            {
                "success": True,
                "source": "docker",
                "container": container,
                "logs": logs_text,
                "availableContainers": available_containers or [],
            }
        )

    return jsonify({"error": "Unsupported source."}), 400


@logs_bp.get("/api/logs/summary")
def get_logs_summary():
    source = str(request.args.get("source") or "docker").strip().lower()
    if source not in _VALID_SOURCES:
        return jsonify({"error": "Unsupported source. Only docker is currently allowed."}), 400

    monitor = get_log_monitor(current_app)
    summary = monitor.get_summary()
    if not summary.get("errors") and not summary.get("warnings"):
        summary["status"] = "no_data"
        summary["message"] = "No logs available to analyze"
    return jsonify(summary)

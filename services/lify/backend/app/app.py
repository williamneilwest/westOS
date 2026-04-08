import socket
import ssl
import urllib.error
import urllib.request

from flask import Flask, jsonify

app = Flask(__name__)


SERVICE_CHECKS = [
    {
        "id": "lify",
        "name": "lify",
        "kind": "public",
        "probe": {"type": "http", "url": "https://wnwest.com"},
    },
    {
        "id": "caddy",
        "name": "caddy",
        "kind": "infra",
        "probe": {"type": "tcp", "host": "caddy", "port": 80},
    },
    {
        "id": "ai-gateway",
        "name": "ai-gateway",
        "kind": "active",
        "probe": {"type": "http", "url": "http://ai-gateway:5000/"},
    },
    {
        "id": "openwebui",
        "name": "openwebui",
        "kind": "public",
        "probe": {"type": "tcp", "host": "openwebui", "port": 8080},
    },
    {
        "id": "kitchen-ai",
        "name": "kitchen-ai",
        "kind": "active",
        "probe": {"type": "tcp", "host": "kitchen-ai", "port": 5000},
    },
    {
        "id": "grocy",
        "name": "grocy",
        "kind": "public",
        "probe": {"type": "tcp", "host": "grocy", "port": 80},
    },
    {
        "id": "mealie",
        "name": "mealie",
        "kind": "public",
        "probe": {"type": "tcp", "host": "mealie", "port": 9000},
    },
    {
        "id": "barcode-intake",
        "name": "barcode-intake",
        "kind": "active",
        "probe": None,
        "status": "unprobed",
        "note": "No network probe available for this device-driven service.",
    },
    {
        "id": "filebrowser",
        "name": "filebrowser",
        "kind": "public",
        "probe": {"type": "tcp", "host": "filebrowser", "port": 80},
    },
    {
        "id": "plex",
        "name": "plex",
        "kind": "public",
        "probe": {"type": "http", "url": "https://plex.wnwest.com"},
    },
    {
        "id": "torrents",
        "name": "torrents",
        "kind": "public",
        "probe": {"type": "tcp", "host": "gluetun", "port": 8080},
    },
    {
        "id": "minecraft",
        "name": "minecraft",
        "kind": "active",
        "probe": {"type": "tcp", "host": "minecraft", "port": 25565},
    },
    {
        "id": "portainer",
        "name": "portainer",
        "kind": "public",
        "probe": {"type": "tcp", "host": "portainer", "port": 9000},
    },
    {
        "id": "code-server",
        "name": "code-server",
        "kind": "public",
        "probe": {"type": "tcp", "host": "code-server", "port": 8080},
    },
    {
        "id": "jupyter",
        "name": "jupyter",
        "kind": "public",
        "probe": {"type": "tcp", "host": "jupyter", "port": 8888},
    },
    {
        "id": "github-sync",
        "name": "github-sync",
        "kind": "active",
        "probe": None,
        "status": "unprobed",
        "note": "No public or internal health endpoint is configured.",
    },
    {
        "id": "homeassistant",
        "name": "homeassistant",
        "kind": "scaffold",
        "probe": None,
        "status": "scaffold",
        "note": "Reserved service boundary. No running container is expected.",
    },
    {
        "id": "samba",
        "name": "samba",
        "kind": "scaffold",
        "probe": None,
        "status": "scaffold",
        "note": "Reserved service boundary. No running container is expected.",
    },
    {
        "id": "dashy",
        "name": "dashy",
        "kind": "scaffold",
        "probe": None,
        "status": "scaffold",
        "note": "Reserved service boundary. No running container is expected.",
    },
]


def _check_tcp(host, port, timeout=2):
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return "online", f"TCP {host}:{port} reachable"
    except OSError as exc:
        return "offline", str(exc)


def _check_http(url, timeout=4):
    request = urllib.request.Request(url, headers={"User-Agent": "westOS-status-check"})
    context = ssl.create_default_context()
    try:
        with urllib.request.urlopen(request, timeout=timeout, context=context) as response:
            code = getattr(response, "status", 200)
            if 200 <= code < 500:
                return "online", f"HTTP {code}"
            return "degraded", f"HTTP {code}"
    except urllib.error.HTTPError as exc:
        if 200 <= exc.code < 500:
            return "online", f"HTTP {exc.code}"
        return "degraded", f"HTTP {exc.code}"
    except Exception as exc:  # pragma: no cover - defensive status path
        return "offline", str(exc)


def _run_probe(service):
    probe = service.get("probe")
    if not probe:
        return service["status"], service.get("note", "")

    if probe["type"] == "tcp":
        return _check_tcp(probe["host"], probe["port"])
    if probe["type"] == "http":
        return _check_http(probe["url"])

    return "unknown", "Unsupported probe type"


def _cors_json(payload):
    response = jsonify(payload)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response

@app.route("/")
def home():
    return jsonify({
        "service": "PrideBytes Flask API",
        "status": "running"
    })

@app.route("/health")
def health():
    return "OK"


@app.route("/status/services", methods=["GET", "OPTIONS"])
@app.route("/api/status/services", methods=["GET", "OPTIONS"])
def service_status():
    results = []
    for service in SERVICE_CHECKS:
        status, note = _run_probe(service)
        results.append(
            {
                "id": service["id"],
                "name": service["name"],
                "kind": service["kind"],
                "status": status,
                "note": note,
            }
        )

    summary = {
        "online": sum(1 for item in results if item["status"] == "online"),
        "degraded": sum(1 for item in results if item["status"] == "degraded"),
        "offline": sum(1 for item in results if item["status"] == "offline"),
        "unprobed": sum(1 for item in results if item["status"] == "unprobed"),
        "scaffold": sum(1 for item in results if item["status"] == "scaffold"),
    }
    return _cors_json({"services": results, "summary": summary})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)

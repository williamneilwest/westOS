import json
import os
import re
import socket
import ssl
import urllib.error
import urllib.request
from time import perf_counter

from flask import current_app

from .runtime_services import list_runtime_services


def _request_json(url, method="GET", headers=None, body=None, timeout=4, ssl_context=None):
    started = perf_counter()
    request = urllib.request.Request(
        url,
        data=body,
        method=method,
        headers=headers or {},
    )

    try:
        if ssl_context is None:
            response_ctx = urllib.request.urlopen(request, timeout=timeout)
        else:
            response_ctx = urllib.request.urlopen(request, timeout=timeout, context=ssl_context)

        with response_ctx as response:
            payload = response.read()
            return {
                "ok": True,
                "status": response.status,
                "headers": dict(response.headers.items()),
                "body": payload,
                "durationMs": round((perf_counter() - started) * 1000, 2),
            }
    except urllib.error.HTTPError as error:
        payload = error.read() if hasattr(error, "read") else b""
        return {
            "ok": False,
            "status": getattr(error, "code", 0) or 0,
            "headers": dict(getattr(error, "headers", {}).items()) if getattr(error, "headers", None) else {},
            "body": payload,
            "durationMs": round((perf_counter() - started) * 1000, 2),
            "error": str(error),
        }
    except (urllib.error.URLError, TimeoutError, socket.timeout, ConnectionError) as error:
        return {
            "ok": False,
            "status": 0,
            "headers": {},
            "body": b"",
            "durationMs": round((perf_counter() - started) * 1000, 2),
            "error": str(getattr(error, "reason", error)),
        }


def _is_json_response(headers):
    content_type = str((headers or {}).get("Content-Type") or "").lower()
    return "application/json" in content_type or content_type.endswith("+json")


def _is_html_response(headers):
    content_type = str((headers or {}).get("Content-Type") or "").lower()
    return "text/html" in content_type


def _replace_route_params(rule):
    replacements = {
        "ticket_id": "TEST-TICKET",
        "analysis_id": "invalid",
        "file_type": "csv",
        "document_id": "1",
        "filename": "missing.json",
        "file_id": "missing",
        "path": "missing",
        "category": "general",
    }

    def _swap(match):
        variable = match.group(1)
        _, _, name = variable.rpartition(":")
        name = name or variable
        if name in replacements:
            return replacements[name]
        if name.endswith("id"):
            return "1"
        return "sample"

    return re.sub(r"<([^>]+)>", _swap, rule)


def _build_api_route_checks():
    checks = []
    excluded_paths = {
        "/api/system/validate",
    }
    for rule in current_app.url_map.iter_rules():
        rule_path = str(rule.rule)
        if not rule_path.startswith("/api/"):
            continue
        if rule_path in excluded_paths:
            continue

        methods = {method for method in (rule.methods or set()) if method in {'GET', 'POST'}}
        if 'GET' not in methods:
            continue

        checks.append(
            {
                "endpoint": rule.endpoint,
                "rule": rule_path,
                "path": _replace_route_params(rule_path),
            }
        )

    unique = {(item["endpoint"], item["path"]): item for item in checks}
    return sorted(unique.values(), key=lambda item: item["path"])


def _validate_api_routes():
    checks = []
    client = current_app.test_client()

    for route in _build_api_route_checks():
        started = perf_counter()
        status = 0
        headers = {}
        html_mismatch = False
        json_like = False
        error = ""

        try:
            response = client.get(route["path"])
            status = int(response.status_code or 0)
            headers = dict(response.headers.items())
            html_mismatch = _is_html_response(headers)
            json_like = _is_json_response(headers)
        except Exception as exc:  # pragma: no cover - defensive path for runtime validator
            error = str(exc)

        expected_status = status in {200, 201, 204, 400, 401, 403, 404, 405}
        result = "ok" if expected_status and not html_mismatch and json_like else "degraded"
        if status == 0 or error:
            result = "fail"

        checks.append(
            {
                "name": f"API {route['path']}",
                "type": "endpoint",
                "result": result,
                "details": {
                    "endpoint": route["endpoint"],
                    "status": status,
                    "contentType": headers.get("Content-Type", ""),
                    "durationMs": round((perf_counter() - started) * 1000, 2),
                    "jsonLike": json_like,
                    "htmlMismatch": html_mismatch,
                    "error": error,
                },
            }
        )

    return checks


def _parse_exposed_ports(ports_text):
    ports = []
    for chunk in str(ports_text or "").split(","):
        match = re.search(r"->(\d+)/(tcp|udp)", chunk)
        if not match:
            continue
        ports.append(int(match.group(1)))
    return sorted(set(ports))


def _probe_socket(host, port):
    started = perf_counter()
    try:
        with socket.create_connection((host, int(port)), timeout=1.5):
            return {
                "result": "ok",
                "durationMs": round((perf_counter() - started) * 1000, 2),
            }
    except OSError as error:
        return {
            "result": "degraded",
            "durationMs": round((perf_counter() - started) * 1000, 2),
            "error": str(error),
        }


def _validate_services():
    checks = []
    service_payload = list_runtime_services()
    services = service_payload.get("services") or []

    if service_payload.get("status") != "ok":
        return [
            {
                "name": "Docker service discovery",
                "type": "service",
                "result": "fail",
                "details": {
                    "message": service_payload.get("message", "Service discovery failed."),
                },
            }
        ]

    for service in services:
        name = str(service.get("name") or "").strip()
        health = str(service.get("health") or "down").strip().lower()
        exposed_ports = _parse_exposed_ports(service.get("ports"))

        status_result = "ok" if health == "healthy" else "degraded"
        checks.append(
            {
                "name": f"Service {name} health",
                "type": "service",
                "result": status_result,
                "details": {
                    "health": health,
                    "status": service.get("status", ""),
                    "ports": service.get("ports", ""),
                },
            }
        )

        for port in exposed_ports:
            probe = _probe_socket(name, port)
            checks.append(
                {
                    "name": f"Service {name}:{port}",
                    "type": "service-port",
                    "result": probe.get("result", "degraded"),
                    "details": {
                        "durationMs": probe.get("durationMs"),
                        "error": probe.get("error", ""),
                    },
                }
            )

    return checks


def _subdomain_request(hostname):
    caddy_host = os.getenv("SYSTEM_VALIDATOR_CADDY_HOST", "caddy")
    started = perf_counter()
    status = 0
    content_type = ""
    body_text = ""
    error = ""

    try:
        context = ssl._create_unverified_context()
        with socket.create_connection((caddy_host, 443), timeout=4) as raw_socket:
            with context.wrap_socket(raw_socket, server_hostname=hostname) as tls_socket:
                tls_socket.settimeout(4)
                request_bytes = (
                    f"GET / HTTP/1.1\r\n"
                    f"Host: {hostname}\r\n"
                    "Accept: text/html,application/json\r\n"
                    "Connection: close\r\n\r\n"
                ).encode("utf-8")
                tls_socket.sendall(request_bytes)
                response_bytes = b""
                while True:
                    try:
                        chunk = tls_socket.recv(4096)
                    except socket.timeout:
                        break
                    if not chunk:
                        break
                    response_bytes += chunk
                    if b"\r\n\r\n" in response_bytes and len(response_bytes) > 2048:
                        break

        header_blob, _, body_blob = response_bytes.partition(b"\r\n\r\n")
        header_lines = header_blob.decode("utf-8", errors="ignore").split("\r\n")
        status_line = header_lines[0] if header_lines else ""
        status_match = re.search(r"\s(\d{3})\s", status_line)
        if status_match:
            status = int(status_match.group(1))
        for line in header_lines[1:]:
            if ":" not in line:
                continue
            key, _, value = line.partition(":")
            if key.strip().lower() == "content-type":
                content_type = value.strip()
                break
        body_text = body_blob.decode("utf-8", errors="ignore")[:800]
    except OSError as exc:
        error = str(exc)

    if status == 0:
        try:
            with socket.create_connection((caddy_host, 80), timeout=3) as http_socket:
                http_socket.settimeout(2)
                request_bytes = (
                    f"GET / HTTP/1.1\r\n"
                    f"Host: {hostname}\r\n"
                    "Connection: close\r\n\r\n"
                ).encode("utf-8")
                http_socket.sendall(request_bytes)
                response_bytes = http_socket.recv(2048)

            header_blob, _, _ = response_bytes.partition(b"\r\n\r\n")
            lines = header_blob.decode("utf-8", errors="ignore").split("\r\n")
            status_line = lines[0] if lines else ""
            status_match = re.search(r"\s(\d{3})\s", status_line)
            location = ""
            for line in lines[1:]:
                if line.lower().startswith("location:"):
                    location = line.split(":", 1)[1].strip()
                    break
            fallback_status = int(status_match.group(1)) if status_match else 0

            if fallback_status in {301, 302, 307, 308} and hostname in location:
                status = fallback_status
                content_type = "redirect"
                error = ""
                result = "ok"
            else:
                result = "degraded"
        except OSError:
            result = "degraded"
    elif status >= 400:
        result = "degraded"
    elif "<html" in body_text.lower() or "<!doctype html" in body_text.lower():
        result = "ok"
    else:
        result = "degraded"

    return {
        "name": f"Subdomain {hostname}",
        "type": "subdomain",
        "result": result,
        "details": {
            "status": status,
            "contentType": content_type,
            "durationMs": round((perf_counter() - started) * 1000, 2),
            "error": error,
        },
    }


def _validate_subdomains():
    return [
        _subdomain_request("work.westos.dev"),
        _subdomain_request("westos.dev"),
    ]


def _validate_ai_gateway():
    payload = json.dumps(
        {
            "message": "System validator ping. Return: ok.",
            "analysis_mode": "preview",
        }
    )
    started = perf_counter()
    status = 0
    headers = {}
    body_raw = b""
    error = ""

    try:
        response = current_app.test_client().post(
            "/api/ai/chat",
            data=payload,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        )
        status = int(response.status_code or 0)
        headers = dict(response.headers.items())
        body_raw = response.data or b""
    except Exception as exc:  # pragma: no cover - defensive path for runtime validator
        error = str(exc)

    gateway_hint = ""
    try:
        parsed = json.loads(body_raw.decode("utf-8", errors="ignore") or "{}")
        gateway_hint = str((parsed.get("data") or {}).get("model") or parsed.get("model") or "")
    except json.JSONDecodeError:
        pass

    if status == 0:
        result = "fail"
    elif status >= 500:
        result = "fail"
    elif status >= 400:
        result = "degraded"
    elif _is_json_response(headers):
        result = "ok"
    else:
        result = "degraded"

    return {
        "name": "AI gateway chat path",
        "type": "ai",
        "result": result,
        "details": {
            "status": status,
            "contentType": headers.get("Content-Type", ""),
            "durationMs": round((perf_counter() - started) * 1000, 2),
            "gatewayModelHint": gateway_hint,
            "error": error,
        },
    }


def _overall_status(checks):
    results = [check.get("result") for check in checks]
    if any(result == "fail" for result in results):
        return "fail"
    if any(result == "degraded" for result in results):
        return "degraded"
    return "ok"


def run_system_validation():
    checks = []
    checks.extend(_validate_api_routes())
    checks.extend(_validate_services())
    checks.extend(_validate_subdomains())
    checks.append(_validate_ai_gateway())

    return {
        "status": _overall_status(checks),
        "checks": checks,
    }

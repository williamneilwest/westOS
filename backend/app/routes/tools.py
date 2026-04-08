import json
import urllib.parse

from flask import Blueprint, current_app, jsonify, request
import requests
from urllib.parse import urlparse

from ..api_response import error_response, success_response
from ..db import db
from ..models import CommandSnippet, ToolLink, UserTool


tools_bp = Blueprint('tools', __name__)


def _is_supported_fetch_url(raw_url: str) -> bool:
    try:
        parsed = urlparse(raw_url)
    except Exception:
        return False
    return parsed.scheme in {'http', 'https'} and bool(parsed.netloc)


@tools_bp.get('/tools/', strict_slashes=False)
def get_tools_data():
    current_app.logger.info('[DB] Fetching table: tool_links')
    links = ToolLink.query.order_by(ToolLink.created_at.desc()).all()
    current_app.logger.info('[DB] Fetching table: command_snippets')
    snippets = CommandSnippet.query.order_by(CommandSnippet.created_at.desc()).all()

    modules = UserTool.query.order_by(UserTool.updated_at.desc()).all()

    return success_response({
        'links': [link.to_dict() for link in links],
        'snippets': [snippet.to_dict() for snippet in snippets],
        'modules': [module.to_dict() for module in modules],
    })


@tools_bp.post('/tools/', strict_slashes=False)
def create_tool_link():
    data = request.get_json(silent=True) or {}
    current_app.logger.info('[TOOLS] create /tools payload=%s', data)

    # Compatibility path: allow module creation payloads on POST /api/tools.
    if data.get('type') is not None or data.get('config') is not None:
        name = str(data.get('name') or '').strip()
        tool_type = str(data.get('type') or '').strip()
        config = data.get('config') if isinstance(data.get('config'), dict) else {}
        if not name:
            return error_response('name is required', 400)
        if not tool_type:
            return error_response('type is required', 400)
        module = UserTool(name=name, type=tool_type, config_json=json.dumps(config))
        db.session.add(module)
        db.session.commit()
        current_app.logger.info('[TOOLS] created module (compat route) id=%s type=%s', module.id, module.type)
        return success_response(module.to_dict(), 201)

    name = str(data.get('name', '')).strip()
    url = str(data.get('url', '')).strip()

    if not name or not url:
        return error_response('name and url are required', 400)

    link = ToolLink(
        id=str(data.get('id') or '').strip() or None,
        name=name,
        url=url,
        category=str(data.get('category') or 'General'),
    )
    db.session.add(link)
    db.session.commit()

    return success_response(link.to_dict(), 201)


@tools_bp.route('/tools/fetch', methods=['GET'], strict_slashes=False)
@tools_bp.route('/fetch', methods=['GET'], strict_slashes=False)
def proxy_fetch():
    try:
        raw_url = request.args.get('url')
        method = str(request.args.get('method') or 'GET').upper()
        timeout_raw = request.args.get('timeout')

        if not raw_url:
            return jsonify({'error': 'Missing URL'}), 400
        if method not in {'GET', 'POST'}:
            return jsonify({'error': 'method must be GET or POST'}), 400

        url = urllib.parse.unquote(raw_url)
        if not _is_supported_fetch_url(url):
            return jsonify({'error': 'URL must be a valid http/https endpoint'}), 400

        timeout_seconds = 20.0
        if timeout_raw is not None:
            try:
                timeout_seconds = float(timeout_raw)
            except (TypeError, ValueError):
                return jsonify({'error': 'timeout must be a number'}), 400

        timeout_seconds = max(3.0, min(timeout_seconds, 120.0))
        current_app.logger.info('[TOOLS] Fetching upstream url=%s method=%s timeout=%.1fs', url, method, timeout_seconds)

        headers = {'User-Agent': 'LifeOS-API-Tester'}
        if method == 'POST':
            res = requests.post(url, headers=headers, timeout=timeout_seconds)
        else:
            res = requests.get(url, headers=headers, timeout=timeout_seconds)

        content_type = res.headers.get('Content-Type', '')
        if 'application/json' in content_type.lower():
            try:
                data = res.json()
            except Exception:
                data = res.text
        else:
            data = res.text

        return jsonify({
            'status': res.status_code,
            'contentType': content_type,
            'data': data,
        })
    except requests.Timeout as error:
        current_app.logger.warning('[TOOLS] proxy_fetch timeout: %s', error)
        return jsonify({
            'error': str(error),
            'message': 'Upstream request timed out',
        }), 504
    except requests.RequestException as error:
        current_app.logger.warning('[TOOLS] proxy_fetch request error: %s', error)
        return jsonify({
            'error': str(error),
            'message': 'Upstream request failed',
        }), 502
    except Exception as error:  # noqa: BLE001
        current_app.logger.exception('[TOOLS] proxy_fetch failed: %s', error)
        return jsonify({
            'error': str(error),
            'message': 'Proxy fetch failed',
        }), 500


def _ensure_default_tool_modules() -> None:
    if UserTool.query.first():
        return
    defaults = [
        UserTool(
            name='Services',
            type='services',
            config_json=json.dumps({'showHomelab': True}),
        ),
        UserTool(
            name='QR Generator',
            type='qr',
            config_json=json.dumps({'defaultText': ''}),
        ),
        UserTool(
            name='API Tester',
            type='api_tester',
            config_json=json.dumps({'baseUrl': '', 'routes': []}),
        ),
    ]
    db.session.add_all(defaults)
    db.session.commit()


@tools_bp.get('/tool-modules', strict_slashes=False)
@tools_bp.get('/tools/modules', strict_slashes=False)
def list_user_tools():
    _ensure_default_tool_modules()
    modules = UserTool.query.order_by(UserTool.updated_at.desc()).all()
    return success_response({'modules': [module.to_dict() for module in modules]})


@tools_bp.post('/tool-modules', strict_slashes=False)
@tools_bp.post('/tools/modules', strict_slashes=False)
def create_user_tool():
    payload = request.get_json(silent=True) or {}
    current_app.logger.info('[TOOLS] create module payload=%s', payload)
    name = str(payload.get('name') or '').strip()
    tool_type = str(payload.get('type') or '').strip()
    config = payload.get('config') if isinstance(payload.get('config'), dict) else {}
    if not name:
        return error_response('name is required', 400)
    if not tool_type:
        return error_response('type is required', 400)
    module = UserTool(name=name, type=tool_type, config_json=json.dumps(config))
    db.session.add(module)
    db.session.commit()
    current_app.logger.info('[TOOLS] created module id=%s type=%s', module.id, module.type)
    return success_response(module.to_dict(), 201)


@tools_bp.put('/tool-modules/<string:module_id>', strict_slashes=False)
@tools_bp.put('/tools/modules/<string:module_id>', strict_slashes=False)
def update_user_tool(module_id: str):
    module = UserTool.query.filter_by(id=module_id).first_or_404()
    payload = request.get_json(silent=True) or {}
    if 'name' in payload:
        name = str(payload.get('name') or '').strip()
        if not name:
            return error_response('name cannot be empty', 400)
        module.name = name
    if 'type' in payload:
        tool_type = str(payload.get('type') or '').strip()
        if not tool_type:
            return error_response('type cannot be empty', 400)
        module.type = tool_type
    if 'config' in payload:
        module.config_json = json.dumps(payload.get('config') if isinstance(payload.get('config'), dict) else {})
    db.session.commit()
    return success_response(module.to_dict())


@tools_bp.delete('/tool-modules/<string:module_id>', strict_slashes=False)
@tools_bp.delete('/tools/modules/<string:module_id>', strict_slashes=False)
def delete_user_tool(module_id: str):
    module = UserTool.query.filter_by(id=module_id).first_or_404()
    db.session.delete(module)
    db.session.commit()
    return success_response({'deleted': True, 'id': module_id})

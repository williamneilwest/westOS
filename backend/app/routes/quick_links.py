from __future__ import annotations

from urllib.parse import urlparse

from flask import Blueprint, current_app, request

from ..auth import auth_required, get_current_user
from ..api_response import error_response, success_response
from ..db import db
from ..models import QuickLink


quick_links_bp = Blueprint('quick_links', __name__)


def _is_valid_url(raw_url: str) -> bool:
    try:
        parsed = urlparse(raw_url)
        return parsed.scheme in {'http', 'https'} and bool(parsed.netloc)
    except Exception:
        return False


def _normalize_url(raw_url: str) -> str:
    value = (raw_url or '').strip()
    if not value:
        return ''
    if not value.startswith(('http://', 'https://')):
        value = f'https://{value}'
    return value


def _domain_from_url(raw_url: str) -> str:
    try:
        return (urlparse(raw_url).netloc or '').strip()
    except Exception:
        return ''


@quick_links_bp.get('/quick-links', strict_slashes=False)
@auth_required
def list_quick_links():
    user = get_current_user()
    links = QuickLink.query.filter_by(user_id=user.id).order_by(QuickLink.created_at.desc()).all()
    return success_response({'links': [link.to_dict() for link in links]})


@quick_links_bp.post('/quick-links', strict_slashes=False)
@auth_required
def create_quick_link():
    user = get_current_user()
    payload = request.get_json(silent=True) or {}
    url = _normalize_url(str(payload.get('url') or ''))
    title = str(payload.get('title') or '').strip()
    category = str(payload.get('category') or '').strip() or None
    icon = str(payload.get('icon') or '').strip() or None

    current_app.logger.info('[QUICK_LINKS] POST /api/quick-links payload_title=%s payload_url=%s', title, url)

    if not url:
        current_app.logger.warning('[QUICK_LINKS] validation failed: url missing')
        return error_response('url is required', 400)
    if not _is_valid_url(url):
        current_app.logger.warning('[QUICK_LINKS] validation failed: invalid url=%s', url)
        return error_response('url must be a valid http/https URL', 400)

    if not title:
        title = _domain_from_url(url)
    if not title:
        current_app.logger.warning('[QUICK_LINKS] validation failed: title missing after normalization')
        return error_response('title is required', 400)

    existing = QuickLink.query.filter_by(user_id=user.id, url=url).first()
    if existing:
        current_app.logger.info('[QUICK_LINKS] duplicate URL detected id=%s url=%s', existing.id, url)
        return error_response('This URL is already saved', 409)

    quick_link = QuickLink(user_id=user.id, title=title, url=url, category=category, icon=icon)
    db.session.add(quick_link)
    db.session.commit()
    current_app.logger.info('[QUICK_LINKS] created id=%s url=%s', quick_link.id, quick_link.url)
    return success_response({'link': quick_link.to_dict()}, 201)


@quick_links_bp.put('/quick-links/<int:link_id>', strict_slashes=False)
@quick_links_bp.patch('/quick-links/<int:link_id>', strict_slashes=False)
@auth_required
def update_quick_link(link_id: int):
    user = get_current_user()
    link = QuickLink.query.filter_by(id=link_id, user_id=user.id).first_or_404()
    payload = request.get_json(silent=True) or {}

    if 'url' in payload:
        url = _normalize_url(str(payload.get('url') or ''))
        if not url:
            return error_response('url cannot be empty', 400)
        if not _is_valid_url(url):
            return error_response('url must be a valid http/https URL', 400)
        duplicate = QuickLink.query.filter(QuickLink.user_id == user.id, QuickLink.url == url, QuickLink.id != link.id).first()
        if duplicate:
            return error_response('This URL is already saved', 409)
        link.url = url

    if 'title' in payload:
        title = str(payload.get('title') or '').strip()
        if not title:
            return error_response('title cannot be empty', 400)
        link.title = title

    if 'category' in payload:
        category = str(payload.get('category') or '').strip()
        link.category = category or None

    if 'icon' in payload:
        icon = str(payload.get('icon') or '').strip()
        link.icon = icon or None

    db.session.commit()
    return success_response({'link': link.to_dict()})


@quick_links_bp.delete('/quick-links/<int:link_id>', strict_slashes=False)
@auth_required
def delete_quick_link(link_id: int):
    user = get_current_user()
    link = QuickLink.query.filter_by(id=link_id, user_id=user.id).first_or_404()
    db.session.delete(link)
    db.session.commit()
    return success_response({'deleted': True, 'id': link_id})

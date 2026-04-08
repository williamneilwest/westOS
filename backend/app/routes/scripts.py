from __future__ import annotations

from flask import Blueprint, request

from ..auth import auth_required, get_current_user
from ..api_response import error_response, success_response
from ..db import db
from ..models import Script


scripts_bp = Blueprint('scripts', __name__)


DEFAULT_SCRIPT_NAME = 'Wipe User Profile'
DEFAULT_SCRIPT_DESCRIPTION = 'Removes a user profile safely and restarts the machine'
DEFAULT_SCRIPT_BODY = (
    "# ==== CONFIG ====\n\n"
    '$targetUsername = "{{username}}"\n\n'
    "# ==== GET USER PROFILE ====\n\n"
    "$profiles = Get-WmiObject Win32_UserProfile | Where-Object {\n"
    '    $_.LocalPath -like "*$targetUsername"\n'
    "}\n\n"
    "if (-not $profiles) {\n"
    '    Write-Host "No profile found for $targetUsername"\n'
    "    exit\n"
    "}\n\n"
    "foreach ($profile in $profiles) {\n"
    "    try {\n"
    '        Write-Host "Removing profile: $($profile.LocalPath)"\n'
    "        $profile.Delete()\n\n"
    "        if (Test-Path $profile.LocalPath) {\n"
    "            Remove-Item -Recurse -Force -Path $profile.LocalPath\n"
    "        }\n\n"
    '        Write-Host "Profile removed successfully."\n'
    "    }\n"
    "    catch {\n"
    '        Write-Host "Error removing profile: $_"\n'
    "    }\n"
    "}\n\n"
    "Restart-Computer -Force\n"
)


def _ensure_default_script_for_user(user_id: str) -> None:
    existing = Script.query.filter_by(user_id=user_id, name=DEFAULT_SCRIPT_NAME).first()
    if existing:
        return
    db.session.add(
        Script(
            user_id=user_id,
            name=DEFAULT_SCRIPT_NAME,
            description=DEFAULT_SCRIPT_DESCRIPTION,
            script=DEFAULT_SCRIPT_BODY,
        )
    )
    db.session.commit()


@scripts_bp.get('/scripts', strict_slashes=False)
@auth_required
def list_scripts():
    user = get_current_user()
    _ensure_default_script_for_user(user.id)
    scripts = Script.query.filter_by(user_id=user.id).order_by(Script.updated_at.desc(), Script.created_at.desc()).all()
    return success_response([script.to_dict() for script in scripts])


@scripts_bp.post('/scripts', strict_slashes=False)
@auth_required
def create_script():
    user = get_current_user()
    payload = request.get_json(silent=True) or {}
    name = str(payload.get('name') or '').strip()
    description = str(payload.get('description') or '').strip()
    script_text = str(payload.get('script') or '')

    if not name:
        return error_response('name is required', 400)
    if not script_text.strip():
        return error_response('script is required', 400)

    script = Script(user_id=user.id, name=name, description=description, script=script_text)
    db.session.add(script)
    db.session.commit()
    return success_response(script.to_dict(), 201)


@scripts_bp.put('/scripts/<string:script_id>', strict_slashes=False)
@auth_required
def update_script(script_id: str):
    user = get_current_user()
    script = Script.query.filter_by(id=script_id, user_id=user.id).first_or_404()
    payload = request.get_json(silent=True) or {}

    if 'name' in payload:
        name = str(payload.get('name') or '').strip()
        if not name:
            return error_response('name cannot be empty', 400)
        script.name = name

    if 'description' in payload:
        script.description = str(payload.get('description') or '').strip()

    if 'script' in payload:
        script_text = str(payload.get('script') or '')
        if not script_text.strip():
            return error_response('script cannot be empty', 400)
        script.script = script_text

    db.session.commit()
    return success_response(script.to_dict())


@scripts_bp.delete('/scripts/<string:script_id>', strict_slashes=False)
@auth_required
def delete_script(script_id: str):
    user = get_current_user()
    script = Script.query.filter_by(id=script_id, user_id=user.id).first_or_404()
    db.session.delete(script)
    db.session.commit()
    return success_response({'deleted': True, 'id': script_id})

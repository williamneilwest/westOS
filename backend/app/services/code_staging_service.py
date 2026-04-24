import difflib
import json
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4


def _utc_now_iso():
    return datetime.now(timezone.utc).isoformat()


def _project_root():
    configured_raw = str(os.getenv('WESTOS_PROJECT_ROOT', '')).strip()
    if configured_raw:
        configured = Path(configured_raw)
        return configured.expanduser().resolve()
    return Path(__file__).resolve().parents[3]


def _staging_root():
    data_dir = Path(str(os.getenv('BACKEND_DATA_DIR', '/app/data')).strip() or '/app/data')
    root = data_dir / 'dev_staging'
    root.mkdir(parents=True, exist_ok=True)
    return root


def _stage_file(stage_id):
    return _staging_root() / f'{stage_id}.json'


def _safe_rel_path(path):
    candidate = Path(str(path or '').strip())
    if not str(candidate):
        return None
    if candidate.is_absolute():
        return None
    cleaned = candidate.as_posix().lstrip('/')
    if not cleaned or cleaned.startswith('../') or '/..' in cleaned or cleaned == '..':
        return None
    if cleaned.startswith('.git/'):
        return None
    return cleaned


def _file_diff(path, current_content, next_content):
    current_lines = str(current_content or '').splitlines(keepends=True)
    next_lines = str(next_content or '').splitlines(keepends=True)
    diff = difflib.unified_diff(
        current_lines,
        next_lines,
        fromfile=f'a/{path}',
        tofile=f'b/{path}',
        lineterm='',
    )
    return '\n'.join(diff)


def _read_text(path_obj):
    if not path_obj.exists():
        return ''
    return path_obj.read_text(encoding='utf-8')


def stage_changes(summary, files, requested_by=''):
    project_root = _project_root()
    normalized_files = []

    for item in files if isinstance(files, list) else []:
        if not isinstance(item, dict):
            continue
        rel_path = _safe_rel_path(item.get('path'))
        if not rel_path:
            continue

        next_content = str(item.get('new_content') if item.get('new_content') is not None else '')
        abs_path = project_root / rel_path
        current_content = _read_text(abs_path)
        diff_text = str(item.get('diff') or '').strip() or _file_diff(rel_path, current_content, next_content)
        normalized_files.append(
            {
                'path': rel_path,
                'new_content': next_content,
                'diff': diff_text,
            }
        )

    stage_id = uuid4().hex
    payload = {
        'stage_id': stage_id,
        'summary': str(summary or '').strip(),
        'files': normalized_files,
        'requested_by': str(requested_by or '').strip(),
        'created_at': _utc_now_iso(),
        'status': 'staged',
    }
    _stage_file(stage_id).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
    return payload


def load_stage(stage_id):
    stage_path = _stage_file(stage_id)
    if not stage_path.exists():
        return None
    content = stage_path.read_text(encoding='utf-8')
    data = json.loads(content)
    if not isinstance(data, dict):
        return None
    return data


def apply_stage(stage_id, approved_files):
    stage = load_stage(stage_id)
    if stage is None:
        raise ValueError('Stage not found')

    approved_set = {str(item).strip() for item in (approved_files or []) if str(item).strip()}
    if not approved_set:
        raise ValueError('approved_files is required')

    project_root = _project_root()
    backup_root = _staging_root() / 'backups' / stage_id
    backup_root.mkdir(parents=True, exist_ok=True)

    applied = []
    for item in stage.get('files') or []:
        path = str(item.get('path') or '').strip()
        if path not in approved_set:
            continue

        target = project_root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists():
            backup_path = backup_root / path
            backup_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(target, backup_path)

        target.write_text(str(item.get('new_content') or ''), encoding='utf-8')
        applied.append(path)

    stage['status'] = 'applied'
    stage['applied_at'] = _utc_now_iso()
    stage['applied_files'] = applied
    _stage_file(stage_id).write_text(json.dumps(stage, ensure_ascii=False, indent=2), encoding='utf-8')
    return {
        'stage_id': stage_id,
        'applied_files': applied,
        'applied_count': len(applied),
    }


def reject_stage(stage_id):
    stage_path = _stage_file(stage_id)
    if stage_path.exists():
        stage_path.unlink()
    return {'stage_id': stage_id, 'status': 'rejected'}

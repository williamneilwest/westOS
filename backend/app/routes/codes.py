from flask import Blueprint, Response, request

from ..api_response import error_response, success_response
from ..services.codes_service import create_code, create_codes_from_upload, get_code_image_path, list_codes


codes_bp = Blueprint("codes", __name__)


@codes_bp.get("/api/work/codes")
def get_codes():
    query = str(request.args.get("q") or "").strip()
    code_type = str(request.args.get("type") or "").strip().lower()
    return success_response({"items": list_codes(query=query, code_type=code_type)})


@codes_bp.post("/api/work/codes")
def create_code_from_text():
    payload = request.get_json(silent=True) or {}
    code_type = str(payload.get("type") or "qr").strip().lower()
    text = str(payload.get("text") or "").strip()
    label = str(payload.get("label") or "").strip()

    try:
        record = create_code(code_type=code_type, text=text, label=label, source="text")
    except ValueError as error:
        return error_response(str(error), 400)

    return success_response({"item": record}, 201)


@codes_bp.post("/api/work/codes/upload")
def create_codes_from_file():
    uploaded = request.files.get("file")
    if uploaded is None or not uploaded.filename:
        return error_response("A text or CSV file is required.", 400)

    code_type = str(request.form.get("type") or "qr").strip().lower()
    try:
        file_bytes = uploaded.stream.read()
        created = create_codes_from_upload(
            file_bytes=file_bytes,
            filename=str(uploaded.filename or "").strip(),
            code_type=code_type,
            source="upload",
        )
    except ValueError as error:
        return error_response(str(error), 400)

    return success_response({"items": created, "created": len(created)}, 201)


@codes_bp.get("/api/work/codes/<code_id>/image")
def get_code_image(code_id):
    image_path = get_code_image_path(code_id)
    if image_path is None:
        return error_response("Code image not found.", 404)
    return Response(
        image_path.read_bytes(),
        mimetype="image/png",
        headers={"Cache-Control": "no-store"},
    )

from flask import Blueprint, jsonify

from ..services.runtime_services import list_runtime_services


services_bp = Blueprint("services", __name__)


@services_bp.get("/api/services")
def get_services():
    return jsonify(list_runtime_services())

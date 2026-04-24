from flask import Blueprint, jsonify, request

from ..services.agent_store import create_agent, get_agent, get_all_agents, save_agents, update_agent


agents_bp = Blueprint("agents", __name__)


@agents_bp.get("/api/agents")
def list_agents():
    return jsonify({"items": get_all_agents()})


@agents_bp.get("/api/agents/<agent_id>")
def get_agent_route(agent_id):
    agent = get_agent(agent_id)
    if not agent:
        return jsonify({"error": "Agent not found"}), 404
    return jsonify(agent)


@agents_bp.post("/api/agents")
def create_agent_route():
    payload = request.get_json(silent=True) or {}
    try:
        created = create_agent(payload)
        return jsonify(created), 201
    except ValueError as error:
        return jsonify({"error": str(error)}), 400


@agents_bp.put("/api/agents/<agent_id>")
def update_agent_route(agent_id):
    payload = request.get_json(silent=True) or {}
    try:
        updated = update_agent(agent_id, payload)
        return jsonify(updated)
    except ValueError as error:
        message = str(error)
        status_code = 404 if "not found" in message.lower() else 400
        return jsonify({"error": message}), status_code


@agents_bp.delete("/api/agents/<agent_id>")
def delete_agent_route(agent_id):
    agents = get_all_agents()
    remaining = [agent for agent in agents if agent.get("id") != str(agent_id or "").strip().lower()]
    if len(remaining) == len(agents):
        return jsonify({"error": "Agent not found"}), 404

    save_agents(remaining)
    return jsonify({"status": "ok"})

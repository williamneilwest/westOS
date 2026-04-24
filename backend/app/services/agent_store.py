import json
import os
import re
from copy import deepcopy

from flask import current_app, has_app_context


DEFAULT_AGENTS = [
    {
        "id": "global_assistant",
        "name": "Global Assistant Router",
        "description": "Routes user requests and handles non-KB assistant responses",
        "enabled": True,
        "prompt_template": (
            "You are the westOS global assistant for in-app guidance.\n\n"
            "Use the provided input and context to answer clearly and briefly.\n\n"
            "Rules:\n"
            "- 2-5 short sentences\n"
            "- task-oriented guidance\n"
            "- if route context is present, include relevant route hints\n"
            "- do not invent internal policy/procedure steps when KB evidence is weak\n\n"
            "Context:\n{{context}}\n\n"
            "User Input:\n{{input}}"
        ),
    },
    {
        "id": "ticket_analyzer",
        "name": "Ticket Analyzer",
        "description": "Casual IT peer ticket analysis",
        "enabled": True,
        "prompt_template": (
            "You are an IT support peer reviewing a ticket.\n\n"
            "Speak casually like a real coworker. Not corporate. Not formal.\n\n"
            "Rules:\n\n"
            "* Short sentences\n"
            "* No fluff\n"
            "* No phrases like 'pertains to' or 'it is recommended'\n"
            "* Sound confident and practical\n\n"
            "Structure:\n\n"
            "1. Quick summary\n"
            "2. Likely cause\n"
            "3. What's been done\n"
            "4. What to do next\n\n"
            "Keep it under 5 lines.\n\n"
            "Ticket Data:\n"
            "{{context}}\n\n"
            "User Input:\n"
            "{{input}}\n\n"
            "Respond naturally."
        ),
    },
    {
        "id": "kb_ingestion",
        "name": "KB Ingestion Agent",
        "description": "Analyzes documents into structured IT knowledge",
        "enabled": True,
        "prompt_template": (
            "You are an IT knowledge-ingestion assistant.\n\n"
            "You must return ONLY valid JSON in this exact shape:\n"
            "{\n"
            '  "human_summary": "short readable summary",\n'
            '  "metadata": {\n'
            '    "title": "document title",\n'
            '    "doc_type": "runbook|kb|policy|reference|troubleshooting",\n'
            '    "tags": ["tag1", "tag2"],\n'
            '    "systems": ["system names"],\n'
            '    "actions": ["key actions"],\n'
            '    "search_hints": ["search phrase 1", "search phrase 2"]\n'
            "  }\n"
            "}\n\n"
            "Rules:\n"
            "- Keep tags specific and technical, avoid generic words.\n"
            "- Include only meaningful systems/actions from the document.\n"
            "- Keep summary concise and practical.\n"
            "- Deduplicate tags/systems/actions.\n"
            "- Do not output markdown.\n\n"
            "Document context:\n{{context}}\n\n"
            "User request:\n{{input}}"
        ),
    },
    {
        "id": "regression_agent",
        "name": "System Regression Agent",
        "description": "Checks westOS against README system contract and reports drift",
        "enabled": True,
        "prompt_template": (
            "You are a strict system regression validator for westOS.\n\n"
            "Inputs:\n"
            "- README contract text in {{context}}\n"
            "- live system snapshot in {{context}}\n"
            "- operator instruction in {{input}}\n\n"
            "Task:\n"
            "Compare runtime system snapshot to README contract. Detect violations, missing components, risky drift, and inconsistencies.\n\n"
            "Return ONLY valid JSON:\n"
            "{\n"
            '  "status": "pass|warn|fail",\n'
            '  "summary": "short plain-language summary",\n'
            '  "matches": ["items that are compliant"],\n'
            '  "warnings": ["non-breaking concerns"],\n'
            '  "failures": ["breaking contract violations"],\n'
            '  "recommended_fixes": ["minimal actionable fixes"]\n'
            "}\n\n"
            "Rules:\n"
            "- No markdown\n"
            "- No prose outside JSON\n"
            "- Keep fixes minimal and specific\n"
            "- Prefer evidence from snapshot fields and route/file presence"
        ),
    },
]


def _data_dir():
    if has_app_context():
        return str(current_app.config.get("BACKEND_DATA_DIR", "/app/data")).strip() or "/app/data"
    return str(os.getenv("BACKEND_DATA_DIR", "/app/data")).strip() or "/app/data"


def _agents_path():
    return os.path.join(_data_dir(), "agents.json")


def _normalize_agent_id(value):
    normalized = re.sub(r"[^a-zA-Z0-9_-]+", "_", str(value or "").strip().lower())
    return normalized.strip("_")


def _normalize_agent(agent):
    if not isinstance(agent, dict):
        return None

    agent_id = _normalize_agent_id(agent.get("id"))
    if not agent_id:
        return None

    name = str(agent.get("name") or "").strip() or agent_id.replace("_", " ").title()
    description = str(agent.get("description") or "").strip()
    prompt_template = str(agent.get("prompt_template") or "").strip()
    if not prompt_template:
        return None

    return {
        "id": agent_id,
        "name": name,
        "description": description,
        "prompt_template": prompt_template,
        "enabled": bool(agent.get("enabled", True)),
    }


def _normalize_agent_list(agents):
    source = agents if isinstance(agents, list) else []
    normalized = []
    seen_ids = set()

    for item in source:
        agent = _normalize_agent(item)
        if not agent:
            continue
        if agent["id"] in seen_ids:
            continue
        seen_ids.add(agent["id"])
        normalized.append(agent)

    if normalized:
        return normalized

    return deepcopy(DEFAULT_AGENTS)


def _ensure_agents_file():
    path = _agents_path()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if os.path.exists(path):
        return path

    with open(path, "w", encoding="utf-8") as handle:
        json.dump(DEFAULT_AGENTS, handle, ensure_ascii=False, indent=2)
    return path


def get_all_agents():
    path = _ensure_agents_file()
    try:
        with open(path, "r", encoding="utf-8") as handle:
            loaded = json.load(handle)
    except (OSError, json.JSONDecodeError):
        loaded = []

    agents = _normalize_agent_list(loaded)
    if agents != loaded:
        save_agents(agents)
    return agents


def get_agent(agent_id):
    target = _normalize_agent_id(agent_id)
    if not target:
        return None
    for agent in get_all_agents():
        if agent["id"] == target:
            return agent
    return None


def save_agents(agents):
    normalized = _normalize_agent_list(agents)
    path = _ensure_agents_file()
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(normalized, handle, ensure_ascii=False, indent=2)
    return normalized


def create_agent(data):
    normalized = _normalize_agent(data or {})
    if not normalized:
        raise ValueError("Invalid agent payload. id and prompt_template are required.")

    agents = get_all_agents()
    if any(agent["id"] == normalized["id"] for agent in agents):
        raise ValueError(f"Agent already exists: {normalized['id']}")

    agents.append(normalized)
    save_agents(agents)
    return normalized


def update_agent(agent_id, data):
    target = _normalize_agent_id(agent_id)
    if not target:
        raise ValueError("agent_id is required")

    agents = get_all_agents()
    updated_agent = None
    for index, agent in enumerate(agents):
        if agent["id"] != target:
            continue

        merged = {
            **agent,
            **(data or {}),
            "id": target,
        }
        normalized = _normalize_agent(merged)
        if not normalized:
            raise ValueError("Invalid agent payload.")
        agents[index] = normalized
        updated_agent = normalized
        break

    if updated_agent is None:
        raise ValueError(f"Agent not found: {target}")

    save_agents(agents)
    return updated_agent

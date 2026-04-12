# westOS

<details>
<summary><strong>Project Directory Tree</strong> (click to expand)</summary>

```text
westos/
├── ai-gateway/
│   ├── app/
│   │   ├── routes/
│   │   └── services/
│   ├── Dockerfile
│   └── wsgi.py
├── backend/
│   ├── app/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   ├── Dockerfile
│   └── wsgi.py
├── caddy/
│   └── Caddyfile
├── data/
├── devtools/
│   └── docker-compose.yml
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   └── features/
│   ├── Dockerfile
│   └── vite.config.js
├── homelab/
│   └── docker-compose.yml
├── docker-compose.yml
└── README.md
```

</details>

A production-focused operations workspace for:

- ticket dataset analysis
- knowledge base document management
- AI-powered document and ticket summarization
- reference/group lookup workflows

This repository contains a React frontend, a Flask backend, and an AI gateway service.

## Architecture

- `frontend/` (`Vite + React`): UI for work tickets, KB, uploads, AI docs, and settings.
- `backend/` (`Flask`): core APIs, document parsing, KB storage, ticket flows, and metadata.
- `ai-gateway/` (`Flask`): unified chat/completions gateway (OpenAI-enabled).
- `data/`: mounted runtime storage for uploads, KB files, and work datasets.
- `caddy/`: reverse proxy and TLS routing.

## Quick Start

### 1. Configure environment

```bash
cp .env.example .env
```

Required values:

- `OPENAI_API_KEY`
- `USE_AI_GATEWAY=true`
- `AI_ANALYSIS_ENABLED=true`

Optional rollout toggle:

- `ENABLE_WEIGHTED_MATCHING=false` (default; keeps legacy-only ticket-to-KB matching)

### 2. Build frontend

```bash
cd frontend
npm install
npm run build
```

### 3. Start stack

```bash
docker compose up --build
```

## Core Backend APIs

### Knowledge Base

- `GET /api/kb`
  - Lists KB categories/files.
  - Preserves existing `tags` field.
  - Adds additive `derived_tags` per file:
    - `primary_action`
    - `system_tags`
    - `action_tags`
    - `context_tags`
    - `normalized_tags`

- `POST /api/kb/analyze`
  - Reprocesses a KB file with document AI.
  - Writes analysis metadata and refreshes derived tags in metadata.

- `POST /api/kb/match`
  - Request:
    ```json
    { "text": "ticket text here" }
    ```
  - Response:
    - `matches`: scored KB matches with legacy and weighted details.
    - `weighted_matching_enabled`: whether weighted matching is active.

### Tickets

- `GET /api/tickets/latest`
  - Returns active ticket dataset payload.

- `GET /api/tickets/<ticket_id>`
  - Returns a single ticket row.

## Tagging and Matching (Production-Safe Rollout)

### Backend single source of truth

- `backend/app/services/tag_derivation.py`
  - Canonical tag normalization (`TAG_MAP`)
  - Low-signal tag handling (`LOW_SIGNAL_TAGS`)
  - Structured derived output:
    - `primary_action` (value + confidence)
    - `system_tags`
    - `action_tags`
    - `context_tags`
    - `normalized_tags`

- `backend/app/services/ticket_match.py`
  - Weighted scoring:
    - system: `6`
    - action: `4`
    - context: `1`
    - primary action bonus: `4` (confidence-gated)
  - Final decision:
    - legacy hit OR weighted score threshold
  - Feature-gated rollout via `ENABLE_WEIGHTED_MATCHING`

### Metadata persistence

KB metadata files (`*.meta.json`) now include additive:

- `derived_tags_v1`

Recomputed when:

- KB file is first ingested
- KB file metadata tags are updated
- KB document is re-analyzed

## Development Notes

- Existing APIs remain backward compatible.
- Existing `tags` behavior is preserved.
- Frontend still contains legacy matching during validation period.
- Planned cleanup marker exists in frontend:
  - `TODO: frontend matching to be removed after backend validation.`

## Validation Commands

Backend syntax check:

```bash
python3 -m py_compile backend/app/routes/kb.py backend/app/routes/email_upload.py backend/app/services/tag_derivation.py backend/app/services/ticket_match.py
```

Frontend build:

```bash
cd frontend
npm run build
```

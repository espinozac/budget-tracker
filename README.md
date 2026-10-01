# Budget Tracker

Personal budget tracker: Vite React client, Express server, and shared Zod types (`@budget/shared`).

## Prerequisites

- Node.js 22.12 or later (see `.nvmrc`)
- pnpm (`npm install -g pnpm`; the repo pins the version via `packageManager`)

## Setup

```bash
pnpm install
```

## Run

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173). Or run the apps separately:

```bash
pnpm --filter server dev
pnpm --filter client dev
```

## Test

```bash
pnpm test
pnpm typecheck
```

## Environment

Copy `server/.env.example` to `server/.env` if you want to override defaults. The server starts with no `.env` file.

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `PORT` | no | `3001` | Server port |
| `DATA_FILE` | no | `./data/transactions.json` | JSON persistence path (resolved from the server package) |
| `ALLOW_FUTURE_DATES` | no | `true` | Set `false` to reject future transaction dates |
| `LLM_BASE_URL` | no | `https://api.groq.com/openai/v1` | OpenAI-compatible chat completions base URL |
| `LLM_MODEL` | no | `llama-3.1-8b-instant` | Model id for category suggestions |
| `LLM_API_KEY` | no | (empty) | Optional free Groq key; without it, suggestions use history only |

Optional free Groq key; without it, suggestions use history only. The key stays on the server and never reaches the client.

## API

Brief endpoints:

- `GET /api/transactions` (filters: `search`, `type`, `category`, `minAmount`, `maxAmount`, `startDate`, `endDate`)
- `POST /api/transactions`
- `PUT /api/transactions/:id`
- `DELETE /api/transactions/:id`
- `GET /api/summary` (same filters; includes all-time totals plus `filteredTotals`)

Extensions:

- `GET /api/categories` - distinct category names
- `POST /api/categories/suggest` - body `{ "description": string, "type": "income" | "expense" }`; returns `{ "category": string | null, "source": "history" | "ai" | "none" }`

Example:

```bash
curl -sS http://localhost:3001/api/categories/suggest \
  -H "Content-Type: application/json" \
  -d '{"description":"Coffee","type":"expense"}'
```

## Notes

- Persistence is a JSON file under `server/data/` (gitignored). Delete the file to reset and re-seed.
- Seed data includes repeated descriptions so history-based category suggestions work on a cold start.
- Interpretation of the brief and product decisions live in `docs/PLAN.md` (and `WRITEUP.md` when present).

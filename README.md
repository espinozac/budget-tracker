# Budget Tracker

A personal budget tracker: log income and expenses, see your totals, and filter and search your history. It is a pnpm monorepo with a Vite React client, an Express server, and a shared package of Zod schemas and types (`@budget/shared`) that both apps import.

```
client/   Vite + React + TypeScript, one page
server/   Express + TypeScript, JSON file persistence
shared/   @budget/shared: Zod schemas and inferred types
docs/     PLAN.md: decisions, phases, progress log
ai/       CONVENTIONS.md and NOTES.md (AI use log)
```

## Prerequisites

- Node.js 22.12 or later. `.nvmrc` pins 22 (LTS), so `nvm use` picks it up.
- pnpm: `npm install -g pnpm`. The repo pins the exact version in the `packageManager` field of `package.json`. If the global install fails with a permissions error, https://pnpm.io/installation lists other ways to install it.

## Setup

From the repo root:

```bash
pnpm install
```

No `.env` file is needed. Every setting has a default (see [Environment variables](#environment-variables)).

## Run

```bash
pnpm dev
```

This starts the server on http://localhost:3001 and the client on http://localhost:5173. Open http://localhost:5173. The client proxies `/api` to the server, so there is no CORS setup.

To run the apps separately, run each command in its own terminal:

```bash
pnpm --filter server dev
pnpm --filter client dev
```

On first start the server creates `server/data/transactions.json` with sample data (see [Notes](#notes)).

## Test

```bash
pnpm test                   # Vitest suites in shared and server
pnpm typecheck              # tsc in client, server, and shared
pnpm --filter client lint   # oxlint
```

Only the client has a lint script, so there is no root `pnpm lint`. The tests cover the schemas, the store, every route, and the suggestion logic. They never call a live model; the LLM is stubbed. The client has no unit tests; the UI was checked by hand.

## Environment variables

All of them are optional. Copy the example file only if you want to change something:

```bash
cp server/.env.example server/.env
```

The server reads `server/.env` at startup, so restart it after a change. Blank values fall back to the default.

| Variable | Required | Default | What it does |
| --- | --- | --- | --- |
| `PORT` | Optional | `3001` | Server port. The client's dev proxy in `client/vite.config.ts` points at 3001, so change both together. |
| `DATA_FILE` | Optional | `./data/transactions.json` | Where transactions are saved. Relative paths resolve from `server/`, so the default file is `server/data/transactions.json`. |
| `ALLOW_FUTURE_DATES` | Optional | `true` | Set to `false` to reject transaction dates after today (the server's local date). |
| `LLM_BASE_URL` | Optional | `https://api.x.ai/v1` | OpenAI-compatible API used for AI category suggestions. |
| `LLM_MODEL` | Optional | `grok-4.7` | Model used for AI category suggestions. |
| `LLM_API_KEY` | Optional | takehome demo default in code | Provider API key. Omit to use the takehome default (demo only; never do this in production). Set to empty for history-only suggestions. |

## API

The server listens on http://localhost:3001. Through the client, the same routes are at http://localhost:5173/api.

| Method and path | Request | Success | Errors |
| --- | --- | --- | --- |
| `GET /api/transactions` | Optional filters (below) | 200, `Transaction[]`, newest date first | 400 bad filter |
| `POST /api/transactions` | Transaction fields, no `id` | 201, the new `Transaction` | 400 invalid body or malformed JSON |
| `PUT /api/transactions/:id` | All transaction fields, no `id` | 200, the updated `Transaction` | 400 bad id or body; 404 unknown id |
| `DELETE /api/transactions/:id` | None | 204, no body | 400 bad id; 404 unknown id |
| `GET /api/summary` | Same filters as the list | 200, `Summary` (below) | 400 bad filter |
| `GET /api/categories` (extension) | None | 200, distinct category names (case-insensitive), sorted | None expected |
| `POST /api/categories/suggest` (extension) | `{ description, type }` | 200, `{ category, source }` | 400 invalid body |
| `GET /api/health` (extension) | None | 200, `{ "ok": true }` | None expected |

**Transaction**

```json
{
  "id": "2b7c0107-945a-42b6-9e4e-c814eac6ad8c",
  "date": "2026-10-01",
  "description": "Coffee",
  "amount": 5.25,
  "type": "expense",
  "category": "Food"
}
```

- `id`: a uuid set by the server.
- `date`: `YYYY-MM-DD`, a real calendar date with no time or zone.
- `description`: 1 to 200 characters after trimming.
- `amount`: greater than 0, at most 2 decimals. Always positive; `type` carries the sign.
- `type`: `income` or `expense`.
- `category`: free text, 1 to 100 characters after trimming.

PUT replaces every field (there is no PATCH). Unknown keys are dropped.

**Filters**

Query params for `GET /api/transactions` and `GET /api/summary`. All are optional, blanks are ignored, and they combine with AND.

| Param | Example | Rule |
| --- | --- | --- |
| `search` | `coffee` | Case-insensitive substring of the description |
| `type` | `expense` | `income` or `expense` |
| `category` | `food` | Exact name, any case |
| `minAmount`, `maxAmount` (extension) | `4`, `10` | Inclusive; `minAmount` cannot be greater than `maxAmount` |
| `startDate`, `endDate` (extension) | `2026-09-01` | Inclusive `YYYY-MM-DD`; `startDate` cannot be after `endDate` |

**Summary**

The top-level totals are always all-time. `filteredTotals` has the same three fields for the rows that match the query params; with no params, it equals the all-time totals. With the seed data, `GET /api/summary?type=expense&search=coffee` returns:

```json
{
  "totalIncome": 7150,
  "totalExpenses": 427.55,
  "netBalance": 6722.45,
  "filteredTotals": { "totalIncome": 0, "totalExpenses": 13.5, "netBalance": -13.5 }
}
```

**Category suggestion**

Send `{ "description": string, "type": "income" | "expense" }`. The reply is `{ "category": string | null, "source": "history" | "ai" | "none" }`, and `category` is null only when `source` is `none`. See [AI suggestions](#ai-suggestions).

**Errors**

Every error has the same shape: `{ "error": { "message": string, "details"?: unknown } }`. Validation errors (400) put Zod's field errors in `details`:

```json
{
  "error": {
    "message": "Validation failed",
    "details": {
      "formErrors": [],
      "fieldErrors": { "amount": ["Amount must be greater than 0"] }
    }
  }
}
```

Malformed JSON returns 400 with no `details`. An unknown id or path returns 404. Anything unexpected returns 500 with a generic message, and the server logs the error.

**Examples** (with the seed data)

```bash
# Coffee expenses from $4 to $10: returns the two matching rows
curl -sS "http://localhost:3001/api/transactions?search=coffee&type=expense&minAmount=4&maxAmount=10"

# Suggest a category: returns {"category":"Food","source":"history"}
curl -sS http://localhost:3001/api/categories/suggest \
  -H "Content-Type: application/json" \
  -d '{"description":"Coffee","type":"expense"}'
```

## AI suggestions

`LLM_API_KEY` is optional: omit it to use the takehome demo default in `server/src/llm.ts`; set it to empty (`LLM_API_KEY=`) for history-only suggestions.

When you leave the Description field and Category is still empty, the form asks the server for a suggestion:

1. History first. If a past transaction has the same description (ignoring case and leading or trailing spaces), its category is used and labeled "Suggested from your history". This needs no key and works on a cold start with the seed data.
2. Otherwise, if a key is available (your env value or the takehome default), the server asks the model to pick one of your existing categories, or a short new one if none fit. It is labeled "Suggested by AI".
3. Otherwise there is no suggestion, and the form works as usual.

A suggestion never replaces a category you typed, and it is announced through the page's live region.

To use your own key (or force history-only):

1. Get an API key from your OpenAI-compatible provider (defaults target xAI: https://console.x.ai), or omit `LLM_API_KEY` to keep the takehome demo default (for this exercise only; never commit secrets in production apps).
2. If you have not yet, copy the example env file: `cp server/.env.example server/.env`.
3. Set `LLM_API_KEY=<your key>` in `server/.env` and restart the server, or set `LLM_API_KEY=` (empty) for history only. `LLM_BASE_URL` and `LLM_MODEL` default to `https://api.x.ai/v1` and `grok-4.7` when unset.

The key stays on the server; the browser never calls the model. Each call has a 3-second timeout, and the reply is validated before use. A timeout, a rate limit (429), or a bad reply means no suggestion, not an error.

## Notes

- **How the brief was interpreted.** [WRITEUP.md](WRITEUP.md) covers the main calls. The full list, with the alternatives, is the Decisions table in [docs/PLAN.md](docs/PLAN.md#decisions).
- **Persistence.** A JSON file (`server/data/transactions.json`, gitignored) with an in-memory Map as the working set. Each change rewrites the file through a temp file and a rename, so data survives restarts. If the file is corrupt, the server stops with a clear error instead of overwriting it.
- **Reset the data.** Stop the server, delete `server/data/transactions.json` (or your `DATA_FILE`), and start it again. If you delete the file while the server runs, the next change writes the old rows back.
- **Seed data.** With no data file, the server writes 12 sample rows across this month and last, dated relative to today. Repeated descriptions (Coffee, Groceries, Paycheck) give history suggestions something to match. This month's rows never land after today, so early in a month several of them share today's date.
- **Known limits.**
  - Single user, no auth, local only, per the brief.
  - Each change rewrites the whole file. That is fine for one user and a small file, not for concurrent writers.
  - Changing `PORT` also means changing the proxy target in `client/vite.config.ts`.
  - History suggestions need the same description, so "Coffee" does not match "Starbucks coffee".
  - Amounts display as USD.
  - Lint covers the client only, and the client has no unit tests.

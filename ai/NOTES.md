# AI use notes

One or two lines per phase: what was asked, what went wrong, how it was steered.

## Phase 1: Scaffold the monorepo

Asked Cursor to scaffold the monorepo only. Global `pnpm@12` install hit EACCES, so installs ran via `npx pnpm@12.8.1` with `packageManager` pinned. Root `pnpm -r` needed `--if-present` on `dev`/`test` because shared has neither; plan updated. `@budget/shared` wired without the mirror-types fallback.

## Phase 2: Domain model, schemas, and store

Asked Cursor for Phase 2 only (schemas, store, seed). It removed the Phase 1 `HealthStatus` placeholder (client health check kept a local type) and found `z.iso.date()` already rejects `2026-02-30`, so no calendar refine. Review fixes: exact 2-decimal amount check, trim query blanks, case-insensitive `categories()`, calendar-month seed.

## Phase 3: REST endpoints

Asked Cursor for Phase 3 only (tests first, then routes). Followed user brief for `createApp(store, options)` / `allowFutureDates` over the Phase 3 Key files' bare `createApp(store)`; plan Key files updated. No blockers; Express 5 promise forwarding meant no try/catch in routes.

Review fixes: load `.env` via `tsx --env-file-if-exists`, stop treating every `SyntaxError` as malformed JSON, tighten 404/query assertions, return Express client statuses (e.g. 413), revert stray lockfile `@pnpm/exe` entries.

README curl keepers:

```bash
curl -sS "http://localhost:3001/api/transactions?search=coffee&type=expense&startDate=2026-09-01&endDate=2026-10-01"
curl -sS http://localhost:3001/api/transactions \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-09-30","description":"Curl marker","amount":12.34,"type":"expense","category":"Food"}'
```

## Phase 4: React UI

Asked for build order 1-3 only (list/delete, summary, form, search + type/category filters), then stop. Packages: `@tanstack/react-query` + catalog `zod` only (no sonner/lucide/cn/shadcn). Bank screenshots drove a centralized navy/orange Tailwind layout without full header/footer. Continued with items 4-6 on go-ahead: amount/date ranges, filtered totals line, edit via PUT. Review fixes: client range checks so inverted filters no longer take over the page; friendly Zod messages; form remount via key; drop Google Fonts; Clear all stays draft-only per product choice (document in WRITEUP). Polish R1-R5: announce filter errors by focusing the field, visible delete failure alert, focusOnMount only after Edit/Cancel/Save, Net balance in the summary dl, surface 4xx above the list. Optional client unit tests skipped (cut item 1).

## Phase 5: AI category suggestions

## Phase 6: README and WRITEUP

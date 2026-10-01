# AI use notes

One or two lines per phase: what was asked, what went wrong, how it was steered.

## Phase 1: Scaffold the monorepo

Asked Cursor to scaffold the monorepo only. Global `pnpm@12` install hit EACCES, so installs ran via `npx pnpm@12.8.1` with `packageManager` pinned. Root `pnpm -r` needed `--if-present` on `dev`/`test` because shared has neither; plan updated. `@budget/shared` wired without the mirror-types fallback.

## Phase 2: Domain model, schemas, and store

Asked Cursor for Phase 2 only (schemas, store, seed). It removed the Phase 1 `HealthStatus` placeholder (client health check kept a local type) and found `z.iso.date()` already rejects `2026-02-30`, so no calendar refine. Review fixes: exact 2-decimal amount check, trim query blanks, case-insensitive `categories()`, calendar-month seed.

## Phase 3: REST endpoints

## Phase 4: React UI

## Phase 5: AI category suggestions

## Phase 6: README and WRITEUP

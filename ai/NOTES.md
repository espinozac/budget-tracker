# AI use notes

One or two lines per phase: what was asked, what went wrong, how it was steered.

## Phase 1: Scaffold the monorepo

Asked Cursor to scaffold the monorepo only. Global `pnpm@12` install hit EACCES, so installs ran via `npx pnpm@12.8.1` with `packageManager` pinned. Root `pnpm -r` needed `--if-present` on `dev`/`test` because shared has neither; plan updated. `@budget/shared` wired without the mirror-types fallback.

## Phase 2: Domain model, schemas, and store

## Phase 3: REST endpoints

## Phase 4: React UI

## Phase 5: AI category suggestions

## Phase 6: README and WRITEUP

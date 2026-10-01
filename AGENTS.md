# Budget Tracker

Personal budget tracker take-home: a pnpm monorepo with a Vite React client, an Express server, and a shared TypeScript package (`@budget/shared`).

## Before you change anything

1. Read `ai/CONVENTIONS.md` (code style).
2. Read `docs/PLAN.md`, including **How agents use this file**, and follow it for scope, status, and progress.

CONVENTIONS wins on code style; PLAN wins on scope and decisions.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm install` | Install all workspace dependencies |
| `pnpm dev` | Start client and server in parallel |
| `pnpm test` | Run tests in every package that defines them |
| `pnpm typecheck` | Typecheck every package |

## Runtime

- Node.js 22 LTS (see `.nvmrc`; engines floor is `>=22.12`)
- pnpm (version pinned in root `packageManager`)

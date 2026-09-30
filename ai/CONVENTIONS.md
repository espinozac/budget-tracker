# Conventions

Lightweight standards for the Budget Tracker take-home.
Goal: consistent, readable TypeScript — not an enterprise rulebook.

---

## Project layout

```
budget-tracker/
  ai/CONVENTIONS.md   (this file)
  client/          Vite + React + TypeScript
  server/          Node + Express (or Fastify) + TypeScript
  README.md
  WRITEUP.md
```

Keep the app as a **single page** on the client. No feature-module sprawl unless
a folder clearly earns its keep.

### Suggested `server/src`

| Path | Role |
| --- | --- |
| `index.ts` | Boot server |
| `app.ts` | Express app, middleware, route mount |
| `types.ts` | Shared domain types |
| `schemas.ts` | Zod schemas for body / params / query |
| `store.ts` | In-memory (or JSON-file) persistence |
| `routes/transactions.ts` | CRUD routes |
| `routes/summary.ts` | Summary route |

### Suggested `client/src`

| Path | Role |
| --- | --- |
| `main.tsx` / `App.tsx` | Entry + page composition |
| `types.ts` | Mirror server types (or import from a tiny shared package later) |
| `api.ts` | Typed `fetch` helpers for the REST API |
| `components/*.tsx` | UI pieces (list, form, summary, filters) |
| `hooks/*.ts` | Data hooks if useful (`useTransactions`) |
| `lib/utils.ts` | `cn()` only if using Tailwind class merging |

---

## File naming

| What | Convention | Example |
| --- | --- | --- |
| React components | PascalCase | `TransactionList.tsx` |
| Hooks | camelCase, `use` prefix | `useTransactions.ts` |
| Types | camelCase file, PascalCase types | `types.ts` → `Transaction` |
| Zod schemas | camelCase | `schemas.ts` or `transaction.schema.ts` |
| API helpers | camelCase | `api.ts` |
| Tests (if any) | Same name + `.test.ts(x)` | `store.test.ts` |

- Named exports for components: `export function TransactionForm(...)`.
- Component name matches file name.
- Prefer `type` over `interface` unless declaration merging is required.

---

## TypeScript

- Strict mode on (`"strict": true`).
- **No `any`.** Use `unknown` and narrow, or a real type.
- Avoid `as` casts unless there is no alternative; comment why if used.
- No `@ts-ignore` / `@ts-expect-error` without a one-line reason.
- Derive types from Zod when practical:

```ts
export const TransactionSchema = z.object({ /* ... */ });
export type Transaction = z.infer<typeof TransactionSchema>;
```

---

## Domain model

Minimum fields (extend only if documented in WRITEUP):

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` (uuid) | Server-generated |
| `date` | ISO date string (`YYYY-MM-DD`) | Keep timezone simple |
| `description` | `string` | Required, trimmed |
| `amount` | `number` | Always **positive**; sign comes from `type` |
| `type` | `"income" \| "expense"` | Discriminator |
| `category` | `string` | e.g. Food, Salary |

Call ambiguous choices in WRITEUP (e.g. amount always positive).

---

## API

- REST paths exactly as specified (`/api/transactions`, `/api/summary`).
- Validate **all** write input with Zod on the server before touching the store.
- Return JSON shapes that the client can type once and reuse.
- Use correct status codes: `200` / `201` / `204` / `400` / `404`.
- Errors: small consistent body, e.g. `{ "error": { "message": string, "details"?: unknown } }`.
- Filters on list: `type`, `category`, `search` (description contains, case-insensitive).

Do **not** add DI containers, CQRS buses, or Clean Architecture layers for this app.

---

## React

- Compose the page from a few components: summary, filters, form, list.
- Server data: fetch in one place (a hook or TanStack Query). Don’t sprinkle
  `useEffect` + fetch across many components.
- Local UI state (`useState`) for form fields and filter controls is fine.
- After create / update / delete, refresh list **and** summary.
- Prefer controlled inputs; show field-level validation errors under the field.
- No unnecessary memoization (`useMemo` / `useCallback`) unless measuring a problem
  or React Compiler is explicitly in play (it isn’t for this take-home).

---

## Forms & validation

- Client: basic required / type checks before submit (Zod is ideal).
- Server: never trust the client — validate again.
- Empty strings → treat as missing after `trim()`.
- Amounts: `> 0`; reject `NaN`.

---

## UI & accessibility

- Semantic HTML: `<form>`, `<label htmlFor>`, `<table>` or list with headings.
- Every input has a visible label (not placeholder-only).
- Buttons have clear text (`Add transaction`, `Delete`); icon-only needs `aria-label`.
- Keyboard usable: tab order, focus visible.
- Usable and clean > pixel-perfect. Tailwind is encouraged; full shadcn setup is optional.

If using Tailwind class merging:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## Styling

- Prefer Tailwind utility classes.
- Avoid large custom CSS files and inline `style={{}}` except for true dynamic values.
- One simple visual language (spacing, type scale, income/expense color) is enough.

---

## Tooling defaults

| Tool | Choice |
| --- | --- |
| Package manager | `pnpm` |
| Client bundler | Vite |
| Server runner | `tsx` watch (or similar) |
| Validation | Zod |
| Persistence | In-memory and/or JSON file (document in README) |

Optional (only if they save time you already have): TanStack Query, a few shadcn primitives, Recharts for the enhancement.

Skip unless needed: TanStack Router, Jotai, neverthrow, MSW, Playwright, Biome+oxlint dual setup, DI, Prisma.

---

## Docs expectations

- `README.md` — cold-start setup (prereqs, install, run client/server, env, notes).
- `WRITEUP.md` — ~400–600 words: decisions, AI use (specific), enhancement + why, what’s next.
- Document the enhancement and any model/API extensions here or in WRITEUP.

---

## AI / Cursor usage

- Use this file as the project convention source so agents don’t invent enterprise structure.
- Prefer small, reviewable diffs over large rewrites.
- If an agent proposes Clean Architecture / CQRS / a DI container — reject it for this repo.

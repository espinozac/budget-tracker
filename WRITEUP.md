# Writeup

## What I built and notable decisions

I built a one-page budget tracker as a pnpm monorepo: a Vite React client, an Express server, and a shared package.

- **Server:** REST endpoints with Express routes. Zod validates every payload, query, and id; one error-handling middleware returns the same JSON error shape. Extensions: range filters, `GET /api/categories`, and `POST /api/categories/suggest`.
- **Shared package:** Zod schemas and types in a pnpm workspace package that Vite and tsx compile from TypeScript source, so the form validates with the server's own rules.
- **Persistence:** a JSON file behind an in-memory Map, written through a temp file and a rename. Data survives restarts without a database.
- **Money:** amounts stay positive and `type` carries the sign. Totals sum in integer cents, so 0.1 + 0.2 is exactly 0.3.
- **Dates:** `YYYY-MM-DD` strings with no time or zone, so a date never shifts by a day across time zones.
- **Summary:** all-time totals plus `filteredTotals` for the list's query params, so one request feeds both the summary panel and the filtered line.

One UI call: Clear all in the filter panel resets the filter fields; nothing changes until you press Apply.

## How I used AI tools

I created a project in Claude and added the PDF file with the requirements. I used Claude (Cowork) to write the planning documents. I planned in Claude, implemented in Cursor, and reviewed with Claude. From experience, I recommended the number of phases, Express, and the React packages. I also provided images with a basic layout from an online bank transactions page.

`AGENTS.md` points every agent at `ai/CONVENTIONS.md` and `docs/PLAN.md`.

I implemented the application in six phases. For each phase, a similar prompt was used to review the plan, create tests when in the plan, implement the feature set, self-check with lint and tests, review, and commit. `ai/NOTES.md` logs what went wrong. For example:

- The first error handler treated every `SyntaxError` as malformed JSON. Review narrowed it and let Express client errors like 413 through.
- An inverted range filter returned a 400 that replaced the whole page. Now the client checks ranges first and shows 4xx errors above the list.
- A late suggestion reply could land after the form reset. A guard now checks it against the current description.

## The enhancement: AI category suggestions

To try to prevent free-text category drift, when you leave Description and Category is still empty, the app suggests one. Before calling an LLM, the suggest logic checks if the description is one you have used before and reuses its category. With an OpenAI-compatible LLM configured, a new description is sent to it within a prompt that also provides the existing categories. The LLM will match the description to one of the existing categories or propose a new one. This flow avoids unnecessary LLM calls and their cost.

Trade-offs: the model call has an 8-second timeout, and Zod validates the reply. A timeout or bad output just means no suggestion. A suggestion never overwrites what you typed.

## Next steps


- Client unit tests and Playwright E2E tests.
- Use a database for persistence. Add `createdDate` and `modifiedDate` to transaction entries.
- Better UI: layout, notifications of success or failure, icons, colors for types, responsive design, more help/info messages, and a spinning icon while processing.
- Authentication.
- Re-suggest when the description changes, as long as you have not typed a category.
- Improve the category-suggestion prompt and pick a faster, still accurate, LLM model so suggestions feel snappier.

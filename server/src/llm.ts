import { z } from "zod";
import type { TransactionType } from "@budget/shared";

export type Llm = (
  description: string,
  type: TransactionType,
  existing: string[],
) => Promise<string | null>;

const Reply = z.object({ category: z.string().trim().min(1).max(100) });

const ChatCompletionSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z
          .object({
            content: z.string().optional(),
          })
          .optional(),
      }),
    )
    .optional(),
});

/**
 * TAKEHOME DEMO ONLY.
 *
 * A real API key in source control is never acceptable in production: it will be
 * scraped from git history, shared with every clone, and is hard to revoke cleanly.
 * This fallback exists only so reviewers of this short exercise can see the AI
 * suggestion path without creating an account. Prefer LLM_API_KEY in server/.env.
 * Set LLM_API_KEY= (empty) in server/.env to disable the model and use history only.
 * Rotate or revoke this key after the take-home is done.
 */
const TAKEHOME_DEFAULT_LLM_API_KEY =
  "xai-xqrmeMWTcLG7FdAGJlZU3YkyZFyyEmysWp0nToRXNXUuwdWFsMbEvA0XRvVfAoyBpUvhQ9tvphmUkIcE";

/** Unset env -> takehome default. Explicit blank -> disabled (history only). */
function resolveApiKey(env: NodeJS.ProcessEnv): string | undefined {
  if (Object.hasOwn(env, "LLM_API_KEY")) {
    const trimmed = env.LLM_API_KEY?.trim() ?? "";
    return trimmed === "" ? undefined : trimmed;
  }
  return TAKEHOME_DEFAULT_LLM_API_KEY;
}

export function createLlm(
  env: NodeJS.ProcessEnv = process.env,
  options: { timeoutMs?: number } = {},
): Llm | undefined {
  const apiKey = resolveApiKey(env);
  if (!apiKey) return undefined;
  const baseUrl = (
    env.LLM_BASE_URL?.trim() || "https://api.x.ai/v1"
  ).replace(/\/$/, "");
  const model = env.LLM_MODEL?.trim() || "grok-4.7";
  const timeoutMs = options.timeoutMs ?? 3000;

  return async (description, type, existing) => {
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          max_tokens: 30,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                'You categorize personal budget transactions. Reply only with JSON: {"category": string}. ' +
                "Pick the best match from the provided categories. Only if none fit, propose a short Title Case category (1-3 words).",
            },
            {
              role: "user",
              content: JSON.stringify({
                description,
                type,
                categories: existing,
              }),
            },
          ],
        }),
      });
      if (!res.ok) return null;
      const data = ChatCompletionSchema.safeParse(await res.json());
      if (!data.success) return null;
      const content = data.data.choices?.[0]?.message?.content ?? "null";
      let raw: unknown;
      try {
        raw = JSON.parse(content);
      } catch {
        return null;
      }
      const parsed = Reply.safeParse(raw);
      if (!parsed.success) return null;
      const match = existing.find(
        (c) => c.toLowerCase() === parsed.data.category.toLowerCase(),
      );
      return match ?? parsed.data.category;
    } catch {
      return null;
    }
  };
}

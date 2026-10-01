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

export function createLlm(env: NodeJS.ProcessEnv = process.env): Llm | undefined {
  const apiKey = env.LLM_API_KEY?.trim();
  if (!apiKey) return undefined;
  const baseUrl = (
    env.LLM_BASE_URL?.trim() || "https://api.groq.com/openai/v1"
  ).replace(/\/$/, "");
  const model = env.LLM_MODEL?.trim() || "llama-3.1-8b-instant";

  return async (description, type, existing) => {
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        signal: AbortSignal.timeout(3000),
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

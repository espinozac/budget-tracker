import type {
  CategorySuggestInput,
  CategorySuggestResult,
  Transaction,
} from "@budget/shared";
import type { Llm } from "./llm";

export type { Llm };

function normalizeDescription(description: string): string {
  return description.trim().toLowerCase();
}

/** Distinct categories from history, first spelling wins (case-insensitive). */
function categoriesFromHistory(history: Transaction[]): string[] {
  const seen = new Map<string, string>();
  for (const tx of history) {
    const key = tx.category.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, tx.category);
    }
  }
  return [...seen.values()];
}

/**
 * Suggest a category from history first (same description after lowercase+trim,
 * most recent by date). The llm is only for a miss; callers may omit it.
 * Type is intentionally ignored: the form suggests on description blur before
 * the user has necessarily chosen income vs expense.
 */
export async function suggestCategory(
  input: CategorySuggestInput,
  history: Transaction[],
  llm?: Llm,
): Promise<CategorySuggestResult> {
  const needle = normalizeDescription(input.description);
  let best: Transaction | undefined;

  for (const tx of history) {
    if (normalizeDescription(tx.description) !== needle) {
      continue;
    }
    if (best === undefined || tx.date > best.date) {
      best = tx;
    }
  }

  if (best !== undefined) {
    return { category: best.category, source: "history" };
  }

  if (llm === undefined) {
    return { category: null, source: "none" };
  }

  try {
    const category = await llm(
      input.description,
      categoriesFromHistory(history),
    );
    if (category === null || category.trim() === "") {
      return { category: null, source: "none" };
    }
    return { category, source: "ai" };
  } catch {
    return { category: null, source: "none" };
  }
}

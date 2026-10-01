import type {
  ApiErrorBody,
  CategorySuggestInput,
  CategorySuggestResult,
  Summary,
  Transaction,
  TransactionInput,
  TransactionQuery,
} from "@budget/shared";
import { ApiErrorBodySchema } from "@budget/shared";

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string[]>;

  constructor(
    status: number,
    message: string,
    fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

function filtersToParams(filters: TransactionQuery): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === "") {
      continue;
    }
    params.set(key, String(value));
  }
  return params;
}

function fieldErrorsFromDetails(
  details: unknown,
): Record<string, string[]> {
  if (
    typeof details !== "object" ||
    details === null ||
    !("fieldErrors" in details)
  ) {
    return {};
  }
  const raw = details.fieldErrors;
  if (typeof raw !== "object" || raw === null) {
    return {};
  }
  const out: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (
      Array.isArray(value) &&
      value.every((item) => typeof item === "string")
    ) {
      // Zod flattenError fieldErrors is Record<string, string[]>
      out[key] = value;
    }
  }
  return out;
}

async function parseErrorBody(res: Response): Promise<ApiError> {
  let body: ApiErrorBody | null = null;
  try {
    const json: unknown = await res.json();
    const parsed = ApiErrorBodySchema.safeParse(json);
    if (parsed.success) {
      body = parsed.data;
    }
  } catch {
    // Non-JSON error body; fall through with a generic message.
  }

  const message = body?.error.message ?? `Request failed (${res.status})`;
  const fieldErrors = fieldErrorsFromDetails(body?.error.details);
  return new ApiError(res.status, message, fieldErrors);
}

async function request<T>(
  path: string,
  init?: RequestInit & { signal?: AbortSignal },
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    throw await parseErrorBody(res);
  }

  if (res.status === 204) {
    // DELETE returns no body; generic T is void at call sites.
    return undefined as T;
  }

  // Response JSON matches the caller's declared success type from @budget/shared.
  return (await res.json()) as T;
}

export function listTransactions(
  filters: TransactionQuery,
  signal?: AbortSignal,
): Promise<Transaction[]> {
  const params = filtersToParams(filters);
  const qs = params.toString();
  const path =
    qs === "" ? "/api/transactions" : `/api/transactions?${qs}`;
  return request<Transaction[]>(path, { signal });
}

export function createTransaction(
  input: TransactionInput,
): Promise<Transaction> {
  return request<Transaction>("/api/transactions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateTransaction(
  id: string,
  input: TransactionInput,
): Promise<Transaction> {
  return request<Transaction>(`/api/transactions/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteTransaction(id: string): Promise<void> {
  return request<void>(`/api/transactions/${id}`, { method: "DELETE" });
}

export function getSummary(
  filters: TransactionQuery,
  signal?: AbortSignal,
): Promise<Summary> {
  const params = filtersToParams(filters);
  const qs = params.toString();
  const path = qs === "" ? "/api/summary" : `/api/summary?${qs}`;
  return request<Summary>(path, { signal });
}

export function getCategories(signal?: AbortSignal): Promise<string[]> {
  return request<string[]>("/api/categories", { signal });
}

export function suggestCategory(
  input: CategorySuggestInput,
): Promise<CategorySuggestResult> {
  return request<CategorySuggestResult>("/api/categories/suggest", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

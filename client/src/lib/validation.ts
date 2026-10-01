import {
  TransactionInputSchema,
  type TransactionInput,
  type TransactionType,
} from "@budget/shared";
import { z } from "zod";

export type FormValues = {
  date: string;
  description: string;
  amount: string;
  type: TransactionType;
  category: string;
};

export type FieldErrors = Partial<Record<keyof FormValues, string[]>>;

function parseAmount(raw: string): number {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return Number.NaN;
  }
  return Number(trimmed);
}

/** Convert form strings and validate with the shared TransactionInputSchema. */
export function parseTransactionInput(
  values: FormValues,
):
  | { ok: true; data: TransactionInput }
  | { ok: false; fieldErrors: FieldErrors } {
  const result = TransactionInputSchema.safeParse({
    date: values.date,
    description: values.description,
    amount: parseAmount(values.amount),
    type: values.type,
    category: values.category,
  });

  if (!result.success) {
    const flat = z.flattenError(result.error);
    return { ok: false, fieldErrors: flat.fieldErrors };
  }

  return { ok: true, data: result.data };
}

/** Map server 400 field errors onto form fields we know about. */
export function mapServerFieldErrors(
  fieldErrors: Record<string, string[] | undefined>,
): FieldErrors {
  const mapped: FieldErrors = {};
  for (const key of [
    "date",
    "description",
    "amount",
    "type",
    "category",
  ] as const) {
    const messages = fieldErrors[key];
    if (messages !== undefined && messages.length > 0) {
      mapped[key] = messages;
    }
  }
  return mapped;
}

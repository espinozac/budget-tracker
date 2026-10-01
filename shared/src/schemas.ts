import { z } from "zod";

export const TransactionTypeSchema = z.enum(["income", "expense"]);

const amountSchema = z
  .number({ error: "Enter a valid amount" })
  .positive("Amount must be greater than 0")
  .refine((n) => Math.round(n * 100) / 100 === n, {
    message: "Amount can have at most 2 decimal places",
  });

export const TransactionInputSchema = z.object({
  date: z.iso.date({ error: "Enter a valid date (YYYY-MM-DD)" }),
  description: z
    .string()
    .trim()
    .min(1, "Enter a description")
    .max(200, "Description must be 200 characters or fewer"),
  amount: amountSchema,
  type: TransactionTypeSchema,
  category: z
    .string()
    .trim()
    .min(1, "Enter a category")
    .max(100, "Category must be 100 characters or fewer"),
});

export const TransactionSchema = TransactionInputSchema.extend({
  id: z.uuid(),
});

function blankToUndefined(value: unknown): unknown {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }
  return value;
}

const optionalQueryString = z.preprocess(
  blankToUndefined,
  z.string().optional(),
);

const optionalQueryType = z.preprocess(
  blankToUndefined,
  TransactionTypeSchema.optional(),
);

const optionalQueryAmount = z.preprocess(
  blankToUndefined,
  z.coerce.number().optional(),
);

const optionalQueryDate = z.preprocess(
  blankToUndefined,
  z.iso.date().optional(),
);

export const TransactionQuerySchema = z
  .object({
    search: optionalQueryString,
    type: optionalQueryType,
    category: optionalQueryString,
    minAmount: optionalQueryAmount,
    maxAmount: optionalQueryAmount,
    startDate: optionalQueryDate,
    endDate: optionalQueryDate,
  })
  .refine(
    (query) =>
      query.minAmount === undefined ||
      query.maxAmount === undefined ||
      query.minAmount <= query.maxAmount,
    {
      message: "minAmount cannot be greater than maxAmount",
      path: ["minAmount"],
    },
  )
  .refine(
    (query) =>
      query.startDate === undefined ||
      query.endDate === undefined ||
      query.startDate <= query.endDate,
    {
      message: "startDate cannot be after endDate",
      path: ["startDate"],
    },
  );

/** Rejects transaction dates after `today` (YYYY-MM-DD, server local). */
export function withNoFutureDates<T extends z.ZodType>(schema: T, today: string) {
  return schema.refine(
    (value) => {
      if (
        typeof value === "object" &&
        value !== null &&
        "date" in value &&
        typeof value.date === "string"
      ) {
        return value.date <= today;
      }
      return false;
    },
    {
      message: "Date cannot be in the future",
      path: ["date"],
    },
  );
}

export const TotalsSchema = z.object({
  totalIncome: z.number(),
  totalExpenses: z.number(),
  netBalance: z.number(),
});

export const SummarySchema = TotalsSchema.extend({
  filteredTotals: TotalsSchema,
});

export const ApiErrorBodySchema = z.object({
  error: z.object({
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

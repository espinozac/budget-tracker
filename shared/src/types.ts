import type { z } from "zod";
import {
  ApiErrorBodySchema,
  CategorySuggestInputSchema,
  CategorySuggestResultSchema,
  CategorySuggestSourceSchema,
  SummarySchema,
  TotalsSchema,
  TransactionInputSchema,
  TransactionQuerySchema,
  TransactionSchema,
  TransactionTypeSchema,
} from "./schemas";

export type TransactionType = z.infer<typeof TransactionTypeSchema>;
export type TransactionInput = z.infer<typeof TransactionInputSchema>;
export type Transaction = z.infer<typeof TransactionSchema>;
export type TransactionQuery = z.infer<typeof TransactionQuerySchema>;
export type Totals = z.infer<typeof TotalsSchema>;
export type Summary = z.infer<typeof SummarySchema>;
export type ApiErrorBody = z.infer<typeof ApiErrorBodySchema>;
export type CategorySuggestInput = z.infer<typeof CategorySuggestInputSchema>;
export type CategorySuggestSource = z.infer<typeof CategorySuggestSourceSchema>;
export type CategorySuggestResult = z.infer<typeof CategorySuggestResultSchema>;

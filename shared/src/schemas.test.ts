import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  TransactionInputSchema,
  TransactionQuerySchema,
  withNoFutureDates,
} from "./schemas";

const validInput = {
  date: "2026-09-15",
  description: "  Coffee  ",
  amount: 4.5,
  type: "expense" as const,
  category: "  Food  ",
};

describe("TransactionInputSchema", () => {
  it("accepts a valid input and returns trimmed fields", () => {
    const result = TransactionInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toEqual({
      date: "2026-09-15",
      description: "Coffee",
      amount: 4.5,
      type: "expense",
      category: "Food",
    });
  });

  it("rejects a blank description", () => {
    const result = TransactionInputSchema.safeParse({
      ...validInput,
      description: "   ",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a blank category", () => {
    expect(
      TransactionInputSchema.safeParse({ ...validInput, category: "" })
        .success,
    ).toBe(false);
    expect(
      TransactionInputSchema.safeParse({ ...validInput, category: "   " })
        .success,
    ).toBe(false);
  });

  it("rejects a category over 100 characters", () => {
    const result = TransactionInputSchema.safeParse({
      ...validInput,
      category: "x".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("rejects amount 0, negative, 3 decimals, or sub-cent values", () => {
    expect(
      TransactionInputSchema.safeParse({ ...validInput, amount: 0 }).success,
    ).toBe(false);
    expect(
      TransactionInputSchema.safeParse({ ...validInput, amount: -1 }).success,
    ).toBe(false);
    expect(
      TransactionInputSchema.safeParse({ ...validInput, amount: 1.234 })
        .success,
    ).toBe(false);
    expect(
      TransactionInputSchema.safeParse({ ...validInput, amount: 1e-9 })
        .success,
    ).toBe(false);
  });

  it("rejects an unknown type", () => {
    const result = TransactionInputSchema.safeParse({
      ...validInput,
      type: "transfer",
    });
    expect(result.success).toBe(false);
  });

  it("rejects US-style and impossible calendar dates", () => {
    expect(
      TransactionInputSchema.safeParse({
        ...validInput,
        date: "09/30/2026",
      }).success,
    ).toBe(false);
    expect(
      TransactionInputSchema.safeParse({
        ...validInput,
        date: "2026-02-30",
      }).success,
    ).toBe(false);
  });

  it("allows a future date by default and rejects it when refined", () => {
    const future = {
      ...validInput,
      date: "2099-01-01",
      description: "Future",
      category: "Other",
    };
    expect(TransactionInputSchema.safeParse(future).success).toBe(true);

    const blocked = withNoFutureDates(TransactionInputSchema, "2026-09-30");
    const result = blocked.safeParse(future);
    expect(result.success).toBe(false);
    if (result.success) return;
    const flat = z.flattenError(result.error);
    expect(flat.fieldErrors.date?.length).toBeGreaterThan(0);
  });

  it("allows a date equal to today when future dates are blocked", () => {
    const today = "2026-09-30";
    const blocked = withNoFutureDates(TransactionInputSchema, today);
    expect(
      blocked.safeParse({ ...validInput, date: today }).success,
    ).toBe(true);
  });
});

describe("TransactionQuerySchema", () => {
  it("turns blank query values into undefined and coerces amounts", () => {
    const result = TransactionQuerySchema.safeParse({
      search: "",
      type: "",
      category: "",
      minAmount: "10",
      maxAmount: "20.5",
      startDate: "",
      endDate: "",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toEqual({
      search: undefined,
      type: undefined,
      category: undefined,
      minAmount: 10,
      maxAmount: 20.5,
      startDate: undefined,
      endDate: undefined,
    });
  });

  it("trims whitespace query values and treats blank/padded as missing", () => {
    const result = TransactionQuerySchema.safeParse({
      search: "   ",
      category: " Food ",
      minAmount: " ",
      maxAmount: "  ",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.search).toBeUndefined();
    expect(result.data.category).toBe("Food");
    expect(result.data.minAmount).toBeUndefined();
    expect(result.data.maxAmount).toBeUndefined();
  });

  it("rejects type=foo and minAmount=abc", () => {
    expect(
      TransactionQuerySchema.safeParse({ type: "foo" }).success,
    ).toBe(false);
    expect(
      TransactionQuerySchema.safeParse({ minAmount: "abc" }).success,
    ).toBe(false);
  });

  it("rejects an inverted amount range", () => {
    const result = TransactionQuerySchema.safeParse({
      minAmount: "20",
      maxAmount: "10",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a start date after the end date", () => {
    const result = TransactionQuerySchema.safeParse({
      startDate: "2026-09-30",
      endDate: "2026-09-01",
    });
    expect(result.success).toBe(false);
  });
});

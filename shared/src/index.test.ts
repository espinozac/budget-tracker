import { describe, expect, it } from "vitest";
import { TransactionTypeSchema } from "./index";

describe("@budget/shared", () => {
  it("re-exports domain schemas", () => {
    expect(TransactionTypeSchema.safeParse("income").success).toBe(true);
  });
});

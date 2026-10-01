import { describe, expect, it, vi } from "vitest";
import type { Transaction } from "@budget/shared";
import type { Llm } from "./llm";
import { suggestCategory } from "./suggest";

function tx(
  overrides: Partial<Transaction> & Pick<Transaction, "description" | "category">,
): Transaction {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    date: overrides.date ?? "2026-09-15",
    description: overrides.description,
    amount: overrides.amount ?? 10,
    type: overrides.type ?? "expense",
    category: overrides.category,
  };
}

describe("suggestCategory (history path)", () => {
  it("returns the most recent matching description with source history", async () => {
    const history = [
      tx({
        date: "2026-09-10",
        description: "Coffee",
        category: "Old Food",
      }),
      tx({
        date: "2026-09-20",
        description: "Coffee",
        category: "Food",
      }),
      tx({
        date: "2026-09-18",
        description: "Groceries",
        category: "Food",
      }),
    ];
    const llm = vi.fn<Llm>();

    const result = await suggestCategory(
      { description: "Coffee" },
      history,
      llm,
    );

    expect(result).toEqual({ category: "Food", source: "history" });
    expect(llm).not.toHaveBeenCalled();
  });

  it("matches descriptions case-insensitively after trim", async () => {
    const history = [
      tx({ description: "  Coffee  ", category: "Food" }),
    ];

    const result = await suggestCategory(
      { description: " coffee" },
      history,
    );

    expect(result).toEqual({ category: "Food", source: "history" });
  });

  it("on equal dates prefers the first match in history (store.list order)", async () => {
    const history = [
      tx({
        date: "2026-09-15",
        description: "Coffee",
        category: "Cafe",
      }),
      tx({
        date: "2026-09-15",
        description: "Coffee",
        category: "Food",
      }),
    ];

    const result = await suggestCategory(
      { description: "Coffee" },
      history,
    );

    expect(result).toEqual({ category: "Cafe", source: "history" });
  });

  it("on a history miss with no llm returns none", async () => {
    const history = [
      tx({ description: "Coffee", category: "Food" }),
    ];

    const result = await suggestCategory(
      { description: "Uber" },
      history,
    );

    expect(result).toEqual({ category: null, source: "none" });
  });
});

describe("suggestCategory (llm path)", () => {
  const history = [tx({ description: "Coffee", category: "Food" })];

  it("returns source ai when the stub returns a category", async () => {
    const llm = vi.fn<Llm>().mockResolvedValue("Transport");

    const result = await suggestCategory(
      { description: "Metro card" },
      history,
      llm,
    );

    expect(result).toEqual({ category: "Transport", source: "ai" });
    expect(llm).toHaveBeenCalledOnce();
    expect(llm).toHaveBeenCalledWith("Metro card", ["Food"]);
  });

  it("passes all history categories to the llm (not filtered by type)", async () => {
    const mixed = [
      tx({ description: "Coffee", type: "expense", category: "Food" }),
      tx({ description: "Paycheck", type: "income", category: "Salary" }),
      tx({ description: "Bonus", type: "income", category: "Side" }),
    ];
    const llm = vi.fn<Llm>().mockResolvedValue("Taxes");

    await suggestCategory({ description: "Income Tax" }, mixed, llm);

    expect(llm).toHaveBeenCalledWith("Income Tax", ["Food", "Salary", "Side"]);
  });

  it("returns none for blank junk output from the stub", async () => {
    const llm = vi.fn<Llm>().mockResolvedValue("   ");

    const result = await suggestCategory(
      { description: "Metro card" },
      history,
      llm,
    );

    expect(result).toEqual({ category: null, source: "none" });
  });

  it("returns none when the stub throws", async () => {
    const llm = vi.fn<Llm>().mockImplementation(() => {
      throw new Error("boom");
    });

    const result = await suggestCategory(
      { description: "Metro card" },
      history,
      llm,
    );

    expect(result).toEqual({ category: null, source: "none" });
  });

  it("returns none when the stub rejects", async () => {
    const llm = vi.fn<Llm>().mockRejectedValue(new Error("aborted"));

    const result = await suggestCategory(
      { description: "Metro card" },
      history,
      llm,
    );

    expect(result).toEqual({ category: null, source: "none" });
  });

  it("returns none when the stub returns null", async () => {
    const llm = vi.fn<Llm>().mockResolvedValue(null);

    const result = await suggestCategory(
      { description: "Metro card" },
      history,
      llm,
    );

    expect(result).toEqual({ category: null, source: "none" });
  });
});

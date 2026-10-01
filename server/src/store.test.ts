import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createStore } from "./store";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

function tempFile(name = "transactions.json"): string {
  const dir = mkdtempSync(join(tmpdir(), "budget-store-"));
  tempDirs.push(dir);
  return join(dir, name);
}

describe("createStore", () => {
  it("create returns a uuid and the row shows up in list", () => {
    const store = createStore();
    const created = store.create({
      date: "2026-09-15",
      description: "Coffee",
      amount: 4.5,
      type: "expense",
      category: "Food",
    });
    expect(created.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(store.list({})).toEqual([created]);
    expect(store.get(created.id)).toEqual(created);
  });

  it("filters by type, category (any case), search, and amount/date ranges", () => {
    const store = createStore();
    store.create({
      date: "2026-09-10",
      description: "Morning Coffee",
      amount: 5,
      type: "expense",
      category: "Food",
    });
    store.create({
      date: "2026-09-12",
      description: "Paycheck",
      amount: 2000,
      type: "income",
      category: "Salary",
    });
    const groceries = store.create({
      date: "2026-09-20",
      description: "Weekly groceries",
      amount: 80,
      type: "expense",
      category: "Food",
    });
    store.create({
      date: "2026-08-01",
      description: "Old coffee",
      amount: 3,
      type: "expense",
      category: "Food",
    });

    expect(store.list({ type: "income" }).map((t) => t.description)).toEqual([
      "Paycheck",
    ]);
    expect(
      store.list({ category: "food" }).map((t) => t.description).sort(),
    ).toEqual(["Morning Coffee", "Old coffee", "Weekly groceries"].sort());
    expect(
      store.list({ search: "COFFEE" }).map((t) => t.description).sort(),
    ).toEqual(["Morning Coffee", "Old coffee"].sort());
    expect(
      store.list({ minAmount: 5, maxAmount: 80 }).map((t) => t.description).sort(),
    ).toEqual(["Morning Coffee", "Weekly groceries"].sort());
    expect(
      store.list({ minAmount: 80 }).map((t) => t.description).sort(),
    ).toEqual(["Paycheck", "Weekly groceries"].sort());
    expect(
      store.list({ maxAmount: 5 }).map((t) => t.description).sort(),
    ).toEqual(["Morning Coffee", "Old coffee"].sort());
    expect(
      store
        .list({ startDate: "2026-09-10", endDate: "2026-09-12" })
        .map((t) => t.description)
        .sort(),
    ).toEqual(["Morning Coffee", "Paycheck"].sort());

    const combined = store.list({
      type: "expense",
      category: "FOOD",
      search: "groc",
      minAmount: 50,
      maxAmount: 100,
      startDate: "2026-09-01",
      endDate: "2026-09-30",
    });
    expect(combined).toEqual([groceries]);
  });

  it("orders by date descending, then newest added", () => {
    const store = createStore();
    const first = store.create({
      date: "2026-09-10",
      description: "First",
      amount: 1,
      type: "expense",
      category: "A",
    });
    const second = store.create({
      date: "2026-09-10",
      description: "Second",
      amount: 2,
      type: "expense",
      category: "A",
    });
    const newerDate = store.create({
      date: "2026-09-20",
      description: "Newer date",
      amount: 3,
      type: "expense",
      category: "A",
    });

    expect(store.list({}).map((t) => t.id)).toEqual([
      newerDate.id,
      second.id,
      first.id,
    ]);
  });

  it("update keeps the id; update and remove report a missing id", () => {
    const store = createStore();
    const created = store.create({
      date: "2026-09-15",
      description: "Coffee",
      amount: 4.5,
      type: "expense",
      category: "Food",
    });
    const updated = store.update(created.id, {
      date: "2026-09-16",
      description: "Tea",
      amount: 3,
      type: "expense",
      category: "Drinks",
    });
    expect(updated).toEqual({
      id: created.id,
      date: "2026-09-16",
      description: "Tea",
      amount: 3,
      type: "expense",
      category: "Drinks",
    });

    const missingId = "00000000-0000-4000-8000-000000000000";
    expect(
      store.update(missingId, {
        date: "2026-09-16",
        description: "Tea",
        amount: 3,
        type: "expense",
        category: "Drinks",
      }),
    ).toBeNull();
    expect(store.remove(missingId)).toBe(false);
    expect(store.remove(created.id)).toBe(true);
    expect(store.get(created.id)).toBeUndefined();
  });

  it("summary is zeros when empty; top-level all-time; filteredTotals follow query; cents-exact", () => {
    const empty = createStore();
    expect(empty.summary({})).toEqual({
      totalIncome: 0,
      totalExpenses: 0,
      netBalance: 0,
      filteredTotals: {
        totalIncome: 0,
        totalExpenses: 0,
        netBalance: 0,
      },
    });

    const store = createStore();
    store.create({
      date: "2026-09-01",
      description: "A",
      amount: 0.1,
      type: "income",
      category: "X",
    });
    store.create({
      date: "2026-09-02",
      description: "B",
      amount: 0.2,
      type: "income",
      category: "X",
    });
    store.create({
      date: "2026-09-15",
      description: "C",
      amount: 5,
      type: "expense",
      category: "Y",
    });

    const all = store.summary({});
    expect(all.totalIncome).toBe(0.3);
    expect(all.totalExpenses).toBe(5);
    expect(all.netBalance).toBe(-4.7);
    expect(all.filteredTotals).toEqual({
      totalIncome: 0.3,
      totalExpenses: 5,
      netBalance: -4.7,
    });

    const filtered = store.summary({ type: "income" });
    expect(filtered.totalIncome).toBe(0.3);
    expect(filtered.totalExpenses).toBe(5);
    expect(filtered.netBalance).toBe(-4.7);
    expect(filtered.filteredTotals).toEqual({
      totalIncome: 0.3,
      totalExpenses: 0,
      netBalance: 0.3,
    });
  });

  it("persists create, update, and remove through reload with stable order", () => {
    const filePath = tempFile();
    const store = createStore({ filePath });
    const older = store.create({
      date: "2026-09-10",
      description: "First",
      amount: 1,
      type: "expense",
      category: "Food",
    });
    const newer = store.create({
      date: "2026-09-10",
      description: "Second",
      amount: 2,
      type: "expense",
      category: "Food",
    });
    const updated = store.update(older.id, {
      date: "2026-09-20",
      description: "Updated first",
      amount: 3,
      type: "expense",
      category: "Food",
    });
    expect(updated).not.toBeNull();
    expect(store.remove(newer.id)).toBe(true);

    const reloaded = createStore({ filePath });
    expect(reloaded.list({}).map((t) => t.id)).toEqual([older.id]);
    expect(reloaded.get(older.id)).toEqual(updated);
    expect(JSON.parse(readFileSync(filePath, "utf8"))).toEqual([updated]);
  });

  it("stops startup with a clear message when the data file is corrupt", () => {
    const filePath = tempFile();
    writeFileSync(filePath, "{not-json", "utf8");
    expect(() => createStore({ filePath })).toThrow(/corrupt/i);
  });

  it("returns distinct category names, keeping the first spelling", () => {
    const store = createStore();
    store.create({
      date: "2026-09-01",
      description: "A",
      amount: 1,
      type: "expense",
      category: "Food",
    });
    store.create({
      date: "2026-09-02",
      description: "B",
      amount: 2,
      type: "expense",
      category: "food",
    });
    store.create({
      date: "2026-09-03",
      description: "C",
      amount: 3,
      type: "income",
      category: "Salary",
    });
    expect(store.categories()).toEqual(["Food", "Salary"]);
  });
});

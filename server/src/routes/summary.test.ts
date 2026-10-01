import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { createStore } from "../store";

describe("GET /api/summary", () => {
  it("returns zeros when empty", async () => {
    const app = createApp(createStore());
    const res = await request(app).get("/api/summary");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      totalIncome: 0,
      totalExpenses: 0,
      netBalance: 0,
      filteredTotals: {
        totalIncome: 0,
        totalExpenses: 0,
        netBalance: 0,
      },
    });
  });

  it("returns all-time totals after two creates", async () => {
    const store = createStore();
    store.create({
      date: "2026-09-10",
      description: "Paycheck",
      amount: 1000,
      type: "income",
      category: "Salary",
    });
    store.create({
      date: "2026-09-12",
      description: "Coffee",
      amount: 4.5,
      type: "expense",
      category: "Food",
    });
    const app = createApp(store);
    const res = await request(app).get("/api/summary");
    expect(res.status).toBe(200);
    expect(res.body.totalIncome).toBe(1000);
    expect(res.body.totalExpenses).toBe(4.5);
    expect(res.body.netBalance).toBe(995.5);
    expect(res.body.filteredTotals).toEqual({
      totalIncome: 1000,
      totalExpenses: 4.5,
      netBalance: 995.5,
    });
  });

  it("keeps all-time totals while filteredTotals follows a date range", async () => {
    const store = createStore();
    store.create({
      date: "2026-08-15",
      description: "Old paycheck",
      amount: 2000,
      type: "income",
      category: "Salary",
    });
    store.create({
      date: "2026-09-10",
      description: "Coffee",
      amount: 5,
      type: "expense",
      category: "Food",
    });
    store.create({
      date: "2026-09-20",
      description: "Groceries",
      amount: 40,
      type: "expense",
      category: "Food",
    });
    const app = createApp(store);
    const res = await request(app).get(
      "/api/summary?startDate=2026-09-01&endDate=2026-09-30",
    );
    expect(res.status).toBe(200);
    expect(res.body.totalIncome).toBe(2000);
    expect(res.body.totalExpenses).toBe(45);
    expect(res.body.netBalance).toBe(1955);
    expect(res.body.filteredTotals).toEqual({
      totalIncome: 0,
      totalExpenses: 45,
      netBalance: -45,
    });
  });

  it("returns 400 for type=foo", async () => {
    const app = createApp(createStore());
    const res = await request(app).get("/api/summary?type=foo");
    expect(res.status).toBe(400);
    expect(res.body.error.details.fieldErrors.type.length).toBeGreaterThan(0);
  });

  it("returns 400 for an inverted date range", async () => {
    const app = createApp(createStore());
    const res = await request(app).get(
      "/api/summary?startDate=2026-09-30&endDate=2026-09-01",
    );
    expect(res.status).toBe(400);
    expect(
      res.body.error.details.fieldErrors.startDate.length,
    ).toBeGreaterThan(0);
  });
});

describe("GET /api/categories", () => {
  it("returns distinct category names", async () => {
    const store = createStore();
    store.create({
      date: "2026-09-10",
      description: "Coffee",
      amount: 4.5,
      type: "expense",
      category: "Food",
    });
    store.create({
      date: "2026-09-11",
      description: "Paycheck",
      amount: 1000,
      type: "income",
      category: "Salary",
    });
    store.create({
      date: "2026-09-12",
      description: "Lunch",
      amount: 12,
      type: "expense",
      category: "food",
    });
    const app = createApp(store);
    const res = await request(app).get("/api/categories");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(["Food", "Salary"]);
  });
});

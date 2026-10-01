import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { createStore } from "../store";

const validBody = {
  date: "2026-09-15",
  description: "Coffee",
  amount: 4.5,
  type: "expense" as const,
  category: "Food",
};

describe("POST /api/transactions", () => {
  it("returns 201 with an id for a valid body", async () => {
    const app = createApp(createStore());
    const res = await request(app).post("/api/transactions").send(validBody);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject(validBody);
    expect(res.body.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("returns 400 with details.fieldErrors.amount for invalid body", async () => {
    const app = createApp(createStore());
    const res = await request(app)
      .post("/api/transactions")
      .send({ ...validBody, amount: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBeTruthy();
    expect(res.body.error.details.fieldErrors.amount.length).toBeGreaterThan(0);
  });

  it("returns 400 in the same error shape for malformed JSON", async () => {
    const app = createApp(createStore());
    const res = await request(app)
      .post("/api/transactions")
      .set("Content-Type", "application/json")
      .send("{not-json");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: expect.objectContaining({
        message: expect.any(String),
      }),
    });
    expect(res.body.error).toHaveProperty("message");
  });

  it("returns 400 for a future date when allowFutureDates is false", async () => {
    const app = createApp(createStore(), { allowFutureDates: false });
    const res = await request(app)
      .post("/api/transactions")
      .send({ ...validBody, date: "2099-01-01" });
    expect(res.status).toBe(400);
    expect(res.body.error.details.fieldErrors.date.length).toBeGreaterThan(0);
  });
});

describe("GET /api/transactions", () => {
  it("returns the transaction array", async () => {
    const store = createStore();
    store.create(validBody);
    const app = createApp(store);
    const res = await request(app).get("/api/transactions");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject(validBody);
  });

  it("applies combined filters via query params", async () => {
    const store = createStore();
    store.create(validBody);
    store.create({
      date: "2026-09-20",
      description: "Paycheck",
      amount: 2000,
      type: "income",
      category: "Salary",
    });
    store.create({
      date: "2026-09-18",
      description: "Morning Coffee",
      amount: 5,
      type: "expense",
      category: "Food",
    });
    const app = createApp(store);
    const res = await request(app).get(
      "/api/transactions?search=coffee&type=expense&category=food&minAmount=4&maxAmount=10&startDate=2026-09-01&endDate=2026-09-30",
    );
    expect(res.status).toBe(200);
    expect(res.body.map((t: { description: string }) => t.description).sort()).toEqual(
      ["Coffee", "Morning Coffee"].sort(),
    );
  });

  it("returns 400 for type=foo", async () => {
    const app = createApp(createStore());
    const res = await request(app).get("/api/transactions?type=foo");
    expect(res.status).toBe(400);
    expect(res.body.error.details.fieldErrors.type.length).toBeGreaterThan(0);
  });

  it("returns 400 for minAmount=abc", async () => {
    const app = createApp(createStore());
    const res = await request(app).get("/api/transactions?minAmount=abc");
    expect(res.status).toBe(400);
    expect(res.body.error.details.fieldErrors.minAmount.length).toBeGreaterThan(
      0,
    );
  });

  it("returns 400 for an inverted date range", async () => {
    const app = createApp(createStore());
    const res = await request(app).get(
      "/api/transactions?startDate=2026-09-30&endDate=2026-09-01",
    );
    expect(res.status).toBe(400);
    expect(
      res.body.error.details.fieldErrors.startDate.length,
    ).toBeGreaterThan(0);
  });
});

describe("PUT /api/transactions/:id", () => {
  it("returns 200 with the updated transaction", async () => {
    const store = createStore();
    const created = store.create(validBody);
    const app = createApp(store);
    const updated = {
      date: "2026-09-16",
      description: "Latte",
      amount: 5.5,
      type: "expense" as const,
      category: "Food",
    };
    const res = await request(app)
      .put(`/api/transactions/${created.id}`)
      .send(updated);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ...updated, id: created.id });
  });

  it("returns 404 for an unknown uuid", async () => {
    const app = createApp(createStore());
    const res = await request(app)
      .put("/api/transactions/00000000-0000-4000-8000-000000000000")
      .send(validBody);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { message: "Transaction not found" } });
  });

  it("returns 400 for a malformed id", async () => {
    const app = createApp(createStore());
    const res = await request(app)
      .put("/api/transactions/not-a-uuid")
      .send(validBody);
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBeTruthy();
  });

  it("returns 400 for an invalid body", async () => {
    const store = createStore();
    const created = store.create(validBody);
    const app = createApp(store);
    const res = await request(app)
      .put(`/api/transactions/${created.id}`)
      .send({ ...validBody, amount: -1 });
    expect(res.status).toBe(400);
    expect(res.body.error.details.fieldErrors.amount.length).toBeGreaterThan(0);
  });

  it("returns 400 for a future date when allowFutureDates is false", async () => {
    const store = createStore();
    const created = store.create(validBody);
    const app = createApp(store, { allowFutureDates: false });
    const res = await request(app)
      .put(`/api/transactions/${created.id}`)
      .send({ ...validBody, date: "2099-01-01" });
    expect(res.status).toBe(400);
    expect(res.body.error.details.fieldErrors.date.length).toBeGreaterThan(0);
  });
});

describe("DELETE /api/transactions/:id", () => {
  it("returns 204 and the row is gone from GET", async () => {
    const store = createStore();
    const created = store.create(validBody);
    const app = createApp(store);
    const del = await request(app).delete(`/api/transactions/${created.id}`);
    expect(del.status).toBe(204);
    expect(del.body).toEqual({});
    const list = await request(app).get("/api/transactions");
    expect(list.body).toEqual([]);
  });

  it("returns 404 for an unknown id", async () => {
    const app = createApp(createStore());
    const res = await request(app).delete(
      "/api/transactions/00000000-0000-4000-8000-000000000000",
    );
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { message: "Transaction not found" } });
  });
});

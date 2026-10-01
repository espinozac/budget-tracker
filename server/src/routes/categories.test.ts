import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import type { Llm } from "../llm";
import { createStore } from "../store";

describe("POST /api/categories/suggest", () => {
  it("returns 400 in the standard error shape for a blank description", async () => {
    const app = createApp(createStore());
    const res = await request(app)
      .post("/api/categories/suggest")
      .send({ description: "   ", type: "expense" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: expect.objectContaining({
        message: expect.any(String),
      }),
    });
    expect(res.body.error.details.fieldErrors.description.length).toBeGreaterThan(
      0,
    );
  });

  it("returns 200 with category and source from history", async () => {
    const store = createStore();
    store.create({
      date: "2026-09-10",
      description: "Coffee",
      amount: 4.5,
      type: "expense",
      category: "Food",
    });
    const app = createApp(store);

    const res = await request(app)
      .post("/api/categories/suggest")
      .send({ description: "coffee", type: "expense" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ category: "Food", source: "history" });
  });

  it("returns 200 with null category and source none on a miss without llm", async () => {
    const app = createApp(createStore());
    const res = await request(app)
      .post("/api/categories/suggest")
      .send({ description: "Never seen before", type: "expense" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ category: null, source: "none" });
  });

  it("returns 200 with source ai when a stubbed llm suggests a category", async () => {
    const llm: Llm = vi.fn().mockResolvedValue("Transport");
    const app = createApp(createStore(), { llm });

    const res = await request(app)
      .post("/api/categories/suggest")
      .send({ description: "Metro card", type: "expense" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ category: "Transport", source: "ai" });
    expect(llm).toHaveBeenCalledOnce();
  });

  it("returns 200 with source none when the stubbed llm throws", async () => {
    const llm: Llm = vi.fn().mockImplementation(() => {
      throw new Error("boom");
    });
    const app = createApp(createStore(), { llm });

    const res = await request(app)
      .post("/api/categories/suggest")
      .send({ description: "Metro card", type: "expense" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ category: null, source: "none" });
  });
});

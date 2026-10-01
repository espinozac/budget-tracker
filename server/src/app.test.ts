import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "./app";
import { createStore } from "./store";

describe("GET /api/health", () => {
  it("returns { ok: true }", async () => {
    const app = createApp(createStore());
    const server = app.listen(0);
    try {
      const res = await request(server).get("/api/health");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });
});

describe("unknown /api paths", () => {
  it("returns a JSON 404", async () => {
    const app = createApp(createStore());
    const res = await request(app).get("/api/nope");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { message: "Not found" } });
  });
});

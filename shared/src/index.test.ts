import { describe, expect, it } from "vitest";
import type { HealthStatus } from "./index";

describe("@budget/shared", () => {
  it("exports a HealthStatus placeholder type", () => {
    const status: HealthStatus = { ok: true };
    expect(status.ok).toBe(true);
  });
});

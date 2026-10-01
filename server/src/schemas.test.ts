import { describe, expect, it } from "vitest";
import { loadEnv } from "./schemas";

describe("loadEnv", () => {
  it("defaults PORT, DATA_FILE, and ALLOW_FUTURE_DATES", () => {
    expect(loadEnv({})).toEqual({
      PORT: 3001,
      DATA_FILE: "./data/transactions.json",
      ALLOW_FUTURE_DATES: true,
    });
  });

  it("treats blank PORT as the default and parses stringbool flags", () => {
    expect(loadEnv({ PORT: "", ALLOW_FUTURE_DATES: "no" })).toEqual({
      PORT: 3001,
      DATA_FILE: "./data/transactions.json",
      ALLOW_FUTURE_DATES: false,
    });
  });

  it("rejects a typo in ALLOW_FUTURE_DATES", () => {
    expect(() => loadEnv({ ALLOW_FUTURE_DATES: "fasle" })).toThrow();
  });
});

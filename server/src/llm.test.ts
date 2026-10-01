import { afterEach, describe, expect, it, vi } from "vitest";
import { createLlm } from "./llm";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function completionContent(content: string): unknown {
  return { choices: [{ message: { content } }] };
}

describe("createLlm", () => {
  it("returns undefined when LLM_API_KEY is missing", () => {
    expect(createLlm({})).toBeUndefined();
    expect(createLlm({ LLM_API_KEY: "" })).toBeUndefined();
    expect(createLlm({ LLM_API_KEY: "   " })).toBeUndefined();
  });

  it("uses Groq defaults when LLM_BASE_URL and LLM_MODEL are empty", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        completionContent(JSON.stringify({ category: "Food" })),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const llm = createLlm({
      LLM_API_KEY: "test-key",
      LLM_BASE_URL: "",
      LLM_MODEL: "",
    });

    await llm!("Coffee", "expense", ["Food"]);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer test-key",
      "Content-Type": "application/json",
    });
    expect(typeof init.body).toBe("string");
    if (typeof init.body !== "string") {
      throw new Error("expected fetch body to be a JSON string");
    }
    const body: unknown = JSON.parse(init.body);
    expect(body).toMatchObject({
      model: "llama-3.1-8b-instant",
      temperature: 0,
      max_tokens: 30,
    });
    if (
      typeof body !== "object" ||
      body === null ||
      !("messages" in body) ||
      !Array.isArray(body.messages) ||
      typeof body.messages[1]?.content !== "string"
    ) {
      throw new Error("expected chat completion messages[1].content string");
    }
    expect(JSON.parse(body.messages[1].content)).toEqual({
      description: "Coffee",
      type: "expense",
      categories: ["Food"],
    });
  });

  it("returns null on HTTP 429", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: "rate limited" }, 429)),
    );
    const llm = createLlm({ LLM_API_KEY: "test-key" });
    expect(llm).toBeDefined();

    const result = await llm!("Uber", "expense", ["Food", "Transport"]);
    expect(result).toBeNull();
  });

  it("returns null on HTTP 500", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: "server" }, 500)),
    );
    const llm = createLlm({ LLM_API_KEY: "test-key" });

    const result = await llm!("Uber", "expense", ["Food"]);
    expect(result).toBeNull();
  });

  it("returns null when fetch rejects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );
    const llm = createLlm({ LLM_API_KEY: "test-key" });

    const result = await llm!("Uber", "expense", ["Food"]);
    expect(result).toBeNull();
  });

  it("returns null when the request times out", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            const signal = init?.signal;
            if (signal?.aborted) {
              reject(new DOMException("Aborted", "AbortError"));
              return;
            }
            signal?.addEventListener("abort", () => {
              reject(new DOMException("Aborted", "AbortError"));
            });
          }),
      ),
    );
    const llm = createLlm({ LLM_API_KEY: "test-key" });

    const result = await llm!("Uber", "expense", ["Food"]);
    expect(result).toBeNull();
  }, 5000);

  it("returns null when message content is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(completionContent("not-json")),
      ),
    );
    const llm = createLlm({ LLM_API_KEY: "test-key" });

    const result = await llm!("Uber", "expense", ["Food"]);
    expect(result).toBeNull();
  });

  it("returns null when the HTTP body is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<html>oops</html>", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        }),
      ),
    );
    const llm = createLlm({ LLM_API_KEY: "test-key" });

    const result = await llm!("Uber", "expense", ["Food"]);
    expect(result).toBeNull();
  });

  it("returns null when category exceeds 100 characters", async () => {
    const longName = "A".repeat(101);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          completionContent(JSON.stringify({ category: longName })),
        ),
      ),
    );
    const llm = createLlm({ LLM_API_KEY: "test-key" });

    const result = await llm!("Uber", "expense", ["Food"]);
    expect(result).toBeNull();
  });

  it("returns null when category is not a string", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          completionContent(JSON.stringify({ category: 42 })),
        ),
      ),
    );
    const llm = createLlm({ LLM_API_KEY: "test-key" });

    const result = await llm!("Uber", "expense", ["Food"]);
    expect(result).toBeNull();
  });

  it("returns the stored spelling for a differently cased existing category", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          completionContent(JSON.stringify({ category: "food" })),
        ),
      ),
    );
    const llm = createLlm({ LLM_API_KEY: "test-key" });

    const result = await llm!("Groceries", "expense", ["Food", "Transport"]);
    expect(result).toBe("Food");
  });

  it("returns a proposed category when none of the existing list match", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          completionContent(JSON.stringify({ category: "Ride Share" })),
        ),
      ),
    );
    const llm = createLlm({ LLM_API_KEY: "test-key" });

    const result = await llm!("Uber", "expense", ["Food"]);
    expect(result).toBe("Ride Share");
  });
});

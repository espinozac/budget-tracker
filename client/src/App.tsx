import { useEffect, useState } from "react";

type HealthResponse = { ok: boolean };

export function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/health")
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Health check failed (${res.status})`);
        }
        // Health scaffold shape is local until Phase 3 wires shared API types
        return (await res.json()) as HealthResponse;
      })
      .then((body) => {
        if (!cancelled) {
          setHealth(body);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Health check failed");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const statusLabel =
    error != null
      ? `Error: ${error}`
      : health == null
        ? "Checking..."
        : health.ok
          ? "OK"
          : "Not OK";

  return (
    <main className="min-h-svh p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Budget Tracker</h1>
      <p className="mt-4">
        API health: <span>{statusLabel}</span>
      </p>
    </main>
  );
}

export default App;

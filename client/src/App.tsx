import { useEffect, useState } from "react";
import type { HealthStatus } from "@budget/shared";

export function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/health")
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Health check failed (${res.status})`);
        }
        // Response matches HealthStatus from @budget/shared
        return (await res.json()) as HealthStatus;
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

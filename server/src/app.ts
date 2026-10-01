import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { ZodError, z } from "zod";
import { HttpError } from "./http";
import { categoriesRouter } from "./routes/categories";
import { summaryRouter } from "./routes/summary";
import { transactionsRouter } from "./routes/transactions";
import type { Store } from "./store";

export type CreateAppOptions = {
  allowFutureDates?: boolean;
};

function isMalformedJson(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "type" in err &&
    err.type === "entity.parse.failed"
  );
}

function clientErrorStatus(err: unknown): number | undefined {
  if (typeof err !== "object" || err === null) {
    return undefined;
  }
  const status =
    "status" in err && typeof err.status === "number"
      ? err.status
      : "statusCode" in err && typeof err.statusCode === "number"
        ? err.statusCode
        : undefined;
  if (status !== undefined && status >= 400 && status < 500) {
    return status;
  }
  return undefined;
}

export function createApp(
  store: Store,
  options: CreateAppOptions = {},
): Express {
  const allowFutureDates = options.allowFutureDates ?? true;
  const app = express();

  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use(
    "/api/transactions",
    transactionsRouter(store, { allowFutureDates }),
  );
  app.use("/api/summary", summaryRouter(store));
  app.use("/api/categories", categoriesRouter(store));

  app.use((_req, res) => {
    res.status(404).json({
      error: { message: "Not found" },
    });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({
        error: {
          message: err.message,
          ...(err.details !== undefined ? { details: err.details } : {}),
        },
      });
      return;
    }

    if (err instanceof ZodError) {
      res.status(400).json({
        error: {
          message: "Validation failed",
          details: z.flattenError(err),
        },
      });
      return;
    }

    if (isMalformedJson(err)) {
      res.status(400).json({
        error: { message: "Malformed JSON" },
      });
      return;
    }

    const status = clientErrorStatus(err);
    if (status !== undefined) {
      const message =
        typeof err === "object" &&
        err !== null &&
        "message" in err &&
        typeof err.message === "string"
          ? err.message
          : "Bad request";
      res.status(status).json({
        error: { message },
      });
      return;
    }

    console.error(err);
    res.status(500).json({
      error: { message: "Internal server error" },
    });
  });

  return app;
}

import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";

export function createApp(): Express {
  const app = express();

  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use((_req, res) => {
    res.status(404).json({
      error: { message: "Not found" },
    });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({
      error: { message: "Internal server error" },
    });
  });

  return app;
}

import { Router } from "express";
import type { Store } from "../store";

export function categoriesRouter(store: Store): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json(store.categories());
  });

  return router;
}

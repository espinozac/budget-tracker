import { Router } from "express";
import { TransactionQuerySchema } from "@budget/shared";
import { parse } from "../http";
import type { Store } from "../store";

export function summaryRouter(store: Store): Router {
  const router = Router();

  router.get("/", (req, res) => {
    const query = parse(TransactionQuerySchema, req.query);
    res.json(store.summary(query));
  });

  return router;
}

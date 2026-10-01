import { Router } from "express";
import {
  TransactionInputSchema,
  TransactionQuerySchema,
  withNoFutureDates,
} from "@budget/shared";
import { HttpError, parse } from "../http";
import { IdParamsSchema } from "../schemas";
import type { Store } from "../store";

export type TransactionsRouterOptions = {
  allowFutureDates: boolean;
};

function todayLocal(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function inputSchema(allowFutureDates: boolean) {
  if (allowFutureDates) {
    return TransactionInputSchema;
  }
  return withNoFutureDates(TransactionInputSchema, todayLocal());
}

export function transactionsRouter(
  store: Store,
  options: TransactionsRouterOptions,
): Router {
  const router = Router();

  router.get("/", (req, res) => {
    const query = parse(TransactionQuerySchema, req.query);
    res.json(store.list(query));
  });

  router.post("/", (req, res) => {
    const body = parse(inputSchema(options.allowFutureDates), req.body);
    res.status(201).json(store.create(body));
  });

  router.put("/:id", (req, res) => {
    const { id } = parse(IdParamsSchema, req.params);
    const body = parse(inputSchema(options.allowFutureDates), req.body);
    const updated = store.update(id, body);
    if (!updated) {
      throw new HttpError(404, "Transaction not found");
    }
    res.json(updated);
  });

  router.delete("/:id", (req, res) => {
    const { id } = parse(IdParamsSchema, req.params);
    if (!store.remove(id)) {
      throw new HttpError(404, "Transaction not found");
    }
    res.status(204).send();
  });

  return router;
}

import { Router } from "express";
import { CategorySuggestInputSchema } from "@budget/shared";
import { parse } from "../http";
import type { Llm } from "../llm";
import { suggestCategory } from "../suggest";
import type { Store } from "../store";

export type CategoriesRouterOptions = {
  llm?: Llm;
};

export function categoriesRouter(
  store: Store,
  options: CategoriesRouterOptions = {},
): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json(store.categories());
  });

  router.post("/suggest", async (req, res) => {
    const input = parse(CategorySuggestInputSchema, req.body);
    const result = await suggestCategory(
      input,
      store.list({}),
      options.llm,
    );
    res.status(200).json(result);
  });

  return router;
}

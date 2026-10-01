import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

export const IdParamsSchema = z.object({
  id: z.uuid(),
});

function emptyToUndefined(value: unknown): unknown {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }
  return value;
}

export const EnvSchema = z.object({
  PORT: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).max(65535).default(3001),
  ),
  DATA_FILE: z.preprocess(
    emptyToUndefined,
    z.string().default("./data/transactions.json"),
  ),
  ALLOW_FUTURE_DATES: z.preprocess(
    emptyToUndefined,
    z.stringbool().default(true),
  ),
});

export type EnvConfig = z.infer<typeof EnvSchema>;

const serverPackageRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);

/** Resolve DATA_FILE from the server package directory, not cwd. */
export function resolveDataFile(dataFile: string): string {
  if (isAbsolute(dataFile)) {
    return dataFile;
  }
  return resolve(serverPackageRoot, dataFile);
}

export function loadEnv(
  env: NodeJS.ProcessEnv = process.env,
): EnvConfig {
  return EnvSchema.parse({
    PORT: env.PORT,
    DATA_FILE: env.DATA_FILE,
    ALLOW_FUTURE_DATES: env.ALLOW_FUTURE_DATES,
  });
}

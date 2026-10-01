import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import {
  TransactionSchema,
  type Summary,
  type Totals,
  type Transaction,
  type TransactionInput,
  type TransactionQuery,
} from "@budget/shared";

export type CreateStoreOptions = {
  filePath?: string;
  seed?: TransactionInput[];
};

export type Store = {
  list: (query: TransactionQuery) => Transaction[];
  get: (id: string) => Transaction | undefined;
  create: (input: TransactionInput) => Transaction;
  update: (id: string, input: TransactionInput) => Transaction | null;
  remove: (id: string) => boolean;
  summary: (query: TransactionQuery) => Summary;
  categories: () => string[];
};

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function fromCents(cents: number): number {
  return cents / 100;
}

function computeTotals(rows: Iterable<Transaction>): Totals {
  let incomeCents = 0;
  let expenseCents = 0;
  for (const row of rows) {
    const cents = toCents(row.amount);
    if (row.type === "income") {
      incomeCents += cents;
    } else {
      expenseCents += cents;
    }
  }
  return {
    totalIncome: fromCents(incomeCents),
    totalExpenses: fromCents(expenseCents),
    netBalance: fromCents(incomeCents - expenseCents),
  };
}

function matchesQuery(
  row: Transaction,
  query: TransactionQuery,
): boolean {
  if (query.type !== undefined && row.type !== query.type) {
    return false;
  }
  if (
    query.category !== undefined &&
    row.category.toLowerCase() !== query.category.toLowerCase()
  ) {
    return false;
  }
  if (
    query.search !== undefined &&
    !row.description.toLowerCase().includes(query.search.toLowerCase())
  ) {
    return false;
  }
  if (query.minAmount !== undefined && row.amount < query.minAmount) {
    return false;
  }
  if (query.maxAmount !== undefined && row.amount > query.maxAmount) {
    return false;
  }
  if (query.startDate !== undefined && row.date < query.startDate) {
    return false;
  }
  if (query.endDate !== undefined && row.date > query.endDate) {
    return false;
  }
  return true;
}

function sortTransactions(
  rows: Transaction[],
  insertionIndex: Map<string, number>,
): Transaction[] {
  return [...rows].sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    const aIndex = insertionIndex.get(a.id) ?? 0;
    const bIndex = insertionIndex.get(b.id) ?? 0;
    return bIndex - aIndex;
  });
}

function loadTransactions(filePath: string): Transaction[] {
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Could not read data file at ${filePath}: ${message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Corrupt data file at ${filePath}: invalid JSON (${message})`,
    );
  }

  if (!Array.isArray(parsed)) {
    throw new Error(
      `Corrupt data file at ${filePath}: expected a JSON array of transactions`,
    );
  }

  const rows: Transaction[] = [];
  for (let i = 0; i < parsed.length; i += 1) {
    const result = TransactionSchema.safeParse(parsed[i]);
    if (!result.success) {
      throw new Error(
        `Corrupt data file at ${filePath}: invalid transaction at index ${i}`,
      );
    }
    rows.push(result.data);
  }
  return rows;
}

function persist(filePath: string, rows: Transaction[]): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tempPath, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
  renameSync(tempPath, filePath);
}

export function createStore(options: CreateStoreOptions = {}): Store {
  const { filePath, seed } = options;
  const rows = new Map<string, Transaction>();
  const insertionIndex = new Map<string, number>();
  let nextIndex = 0;

  const remember = (row: Transaction): void => {
    if (!insertionIndex.has(row.id)) {
      insertionIndex.set(row.id, nextIndex);
      nextIndex += 1;
    }
    rows.set(row.id, row);
  };

  const writeThrough = (): void => {
    if (!filePath) return;
    persist(filePath, [...rows.values()]);
  };

  if (filePath && existsSync(filePath)) {
    for (const row of loadTransactions(filePath)) {
      remember(row);
    }
  } else if (seed) {
    for (const input of seed) {
      remember({ ...input, id: randomUUID() });
    }
    writeThrough();
  }

  return {
    list(query) {
      const filtered = [...rows.values()].filter((row) =>
        matchesQuery(row, query),
      );
      return sortTransactions(filtered, insertionIndex);
    },

    get(id) {
      return rows.get(id);
    },

    create(input) {
      const row: Transaction = { ...input, id: randomUUID() };
      remember(row);
      writeThrough();
      return row;
    },

    update(id, input) {
      if (!rows.has(id)) {
        return null;
      }
      const row: Transaction = { ...input, id };
      rows.set(id, row);
      writeThrough();
      return row;
    },

    remove(id) {
      const existed = rows.delete(id);
      if (existed) {
        writeThrough();
      }
      return existed;
    },

    summary(query) {
      const all = [...rows.values()];
      const filtered = all.filter((row) => matchesQuery(row, query));
      return {
        ...computeTotals(all),
        filteredTotals: computeTotals(filtered),
      };
    },

    categories() {
      const firstSpelling = new Map<string, string>();
      for (const row of rows.values()) {
        const key = row.category.toLowerCase();
        if (!firstSpelling.has(key)) {
          firstSpelling.set(key, row.category);
        }
      }
      return [...firstSpelling.values()].sort((a, b) => a.localeCompare(b));
    },
  };
}

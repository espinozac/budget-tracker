import { useState } from "react";
import type {
  Transaction,
  TransactionInput,
  TransactionQuery,
} from "@budget/shared";
import { ApiError } from "./api";
import { FilterBar, type FilterDraft } from "./components/FilterBar";
import { SummaryPanel } from "./components/SummaryPanel";
import { TransactionForm } from "./components/TransactionForm";
import { TransactionList } from "./components/TransactionList";
import { useDebouncedValue } from "./hooks/useDebouncedValue";
import { useTransactions } from "./hooks/useTransactions";

type UiFilters = FilterDraft & { search: string };

const emptyFilters: UiFilters = {
  search: "",
  type: "",
  category: "",
  minAmount: "",
  maxAmount: "",
  startDate: "",
  endDate: "",
};

function parseOptionalAmount(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return undefined;
  }
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : undefined;
}

function toQuery(filters: UiFilters): TransactionQuery {
  const query: TransactionQuery = {};
  const search = filters.search.trim();
  if (search !== "") {
    query.search = search;
  }
  if (filters.type !== "") {
    query.type = filters.type;
  }
  const category = filters.category.trim();
  if (category !== "") {
    query.category = category;
  }
  const minAmount = parseOptionalAmount(filters.minAmount);
  if (minAmount !== undefined) {
    query.minAmount = minAmount;
  }
  const maxAmount = parseOptionalAmount(filters.maxAmount);
  if (maxAmount !== undefined) {
    query.maxAmount = maxAmount;
  }
  const startDate = filters.startDate.trim();
  if (startDate !== "") {
    query.startDate = startDate;
  }
  const endDate = filters.endDate.trim();
  if (endDate !== "") {
    query.endDate = endDate;
  }
  return query;
}

function hasActiveFilters(filters: UiFilters): boolean {
  return (
    filters.search.trim() !== "" ||
    filters.type !== "" ||
    filters.category.trim() !== "" ||
    filters.minAmount.trim() !== "" ||
    filters.maxAmount.trim() !== "" ||
    filters.startDate.trim() !== "" ||
    filters.endDate.trim() !== ""
  );
}

function panelFilters(filters: UiFilters): FilterDraft {
  return {
    type: filters.type,
    category: filters.category,
    minAmount: filters.minAmount,
    maxAmount: filters.maxAmount,
    startDate: filters.startDate,
    endDate: filters.endDate,
  };
}

export function App() {
  const [filters, setFilters] = useState<UiFilters>(emptyFilters);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [focusForm, setFocusForm] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [listAlert, setListAlert] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(filters.search, 300);

  const queryFilters = toQuery({
    ...filters,
    search: debouncedSearch,
  });

  const {
    transactions,
    summary,
    categories,
    isLoading,
    isError,
    error,
    refetchAll,
    create,
    update,
    remove,
    isCreating,
    isUpdating,
    isDeleting,
  } = useTransactions(queryFilters);

  const isServerDown =
    isError && !(error instanceof ApiError && error.status < 500);
  const clientQueryError =
    isError && error instanceof ApiError && error.status < 500
      ? error.message
      : null;

  function clearListAlert() {
    setListAlert(null);
  }

  async function handleSubmit(input: TransactionInput) {
    clearListAlert();
    if (editing !== null) {
      const saved = await update({ id: editing.id, input });
      setAnnouncement(`Updated ${saved.description}`);
      setEditing(null);
      setFocusForm(true);
      return;
    }
    const created = await create(input);
    setAnnouncement(`Added ${created.description}`);
  }

  async function handleDelete(tx: Transaction) {
    clearListAlert();
    const ok = window.confirm(
      `Delete "${tx.description}" from ${tx.date}?`,
    );
    if (!ok) {
      return;
    }
    if (editing?.id === tx.id) {
      setEditing(null);
      setFocusForm(true);
    }
    try {
      await remove(tx.id);
      const message = `Deleted ${tx.description}`;
      setAnnouncement(message);
      setListAlert(null);
    } catch {
      const message = `Could not delete ${tx.description}`;
      setAnnouncement(message);
      setListAlert(message);
    }
  }

  function clearFilters() {
    clearListAlert();
    setFilters(emptyFilters);
  }

  if (isServerDown) {
    return (
      <div className="min-h-svh bg-slate-100">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <header className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
              Budget Tracker
            </h1>
          </header>
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-white px-5 py-8 text-center"
          >
            <p className="font-semibold text-slate-900">
              Server is unavailable
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {error?.message ?? "Could not reach the API."}
            </p>
            <button
              type="button"
              onClick={() => refetchAll()}
              className="mt-4 rounded-md bg-navy-800 px-4 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-800"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filtersActive = hasActiveFilters({
    ...filters,
    search: debouncedSearch,
  });

  return (
    <div className="min-h-svh bg-slate-100">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-10 w-10 items-center justify-center rounded-md bg-navy-800 text-lg font-bold text-white"
            >
              $
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-navy-900 sm:text-3xl">
                Budget Tracker
              </h1>
              <p className="text-sm text-slate-600">
                Personal income and expenses
              </p>
            </div>
          </div>
        </header>

        <div className="space-y-6">
          <SummaryPanel summary={summary} isLoading={isLoading} />

          <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start">
            <TransactionForm
              key={editing?.id ?? "new"}
              categories={categories}
              editing={editing}
              focusOnMount={focusForm}
              onSubmit={handleSubmit}
              onCancelEdit={() => {
                clearListAlert();
                setEditing(null);
                setFocusForm(true);
              }}
              isSubmitting={isCreating || isUpdating}
              onDescriptionBlur={() => {
                // Phase 5: AI category suggestions hook.
              }}
            />

            <div className="space-y-4">
              <section
                aria-labelledby="history-heading"
                className="rounded-lg border border-slate-200 bg-white px-4 py-4 sm:px-5"
              >
                <div className="mb-4 flex items-end justify-between gap-3 border-b border-slate-200 pb-3">
                  <div>
                    <h2
                      id="history-heading"
                      className="text-lg font-bold text-slate-900"
                    >
                      Transaction History
                    </h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Newest first. Search and filters update the list.
                    </p>
                  </div>
                </div>

                <FilterBar
                  search={filters.search}
                  onSearchChange={(search) => {
                    clearListAlert();
                    setFilters((prev) => ({ ...prev, search }));
                  }}
                  applied={panelFilters(filters)}
                  categories={categories}
                  onApply={(draft: FilterDraft) => {
                    clearListAlert();
                    setFilters((prev) => ({
                      ...prev,
                      type: draft.type,
                      category: draft.category,
                      minAmount: draft.minAmount,
                      maxAmount: draft.maxAmount,
                      startDate: draft.startDate,
                      endDate: draft.endDate,
                    }));
                  }}
                />
              </section>

              {listAlert !== null ? (
                <p
                  role="alert"
                  className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                >
                  {listAlert}
                </p>
              ) : null}

              {clientQueryError !== null ? (
                <p
                  role="alert"
                  className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                >
                  {clientQueryError}
                </p>
              ) : null}

              <TransactionList
                transactions={transactions}
                isLoading={isLoading}
                hasFilters={filtersActive}
                filteredTotals={summary?.filteredTotals}
                onClearFilters={clearFilters}
                onEdit={(tx) => {
                  clearListAlert();
                  setFocusForm(true);
                  setEditing(tx);
                }}
                onDelete={handleDelete}
                isDeleting={isDeleting}
              />
            </div>
          </div>
        </div>

        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {announcement}
        </div>
      </div>
    </div>
  );
}

export default App;

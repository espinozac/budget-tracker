import { useEffect, useId, useRef, useState } from "react";
import type { TransactionType } from "@budget/shared";

export type FilterDraft = {
  type: "" | TransactionType;
  category: string;
  minAmount: string;
  maxAmount: string;
  startDate: string;
  endDate: string;
};

type FilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  applied: FilterDraft;
  onApply: (draft: FilterDraft) => void;
  categories: string[];
};

type RangeErrors = {
  minAmount?: string;
  startDate?: string;
};

const emptyDraft: FilterDraft = {
  type: "",
  category: "",
  minAmount: "",
  maxAmount: "",
  startDate: "",
  endDate: "",
};

function countActive(filters: FilterDraft): number {
  let count = 0;
  if (filters.type !== "") {
    count += 1;
  }
  if (filters.category.trim() !== "") {
    count += 1;
  }
  if (filters.minAmount.trim() !== "") {
    count += 1;
  }
  if (filters.maxAmount.trim() !== "") {
    count += 1;
  }
  if (filters.startDate.trim() !== "") {
    count += 1;
  }
  if (filters.endDate.trim() !== "") {
    count += 1;
  }
  return count;
}

function validateRanges(draft: FilterDraft): RangeErrors {
  const errors: RangeErrors = {};
  const minRaw = draft.minAmount.trim();
  const maxRaw = draft.maxAmount.trim();
  if (minRaw !== "" && maxRaw !== "") {
    const minAmount = Number(minRaw);
    const maxAmount = Number(maxRaw);
    if (
      Number.isFinite(minAmount) &&
      Number.isFinite(maxAmount) &&
      minAmount > maxAmount
    ) {
      errors.minAmount = "From cannot be greater than To";
    }
  }
  const startDate = draft.startDate.trim();
  const endDate = draft.endDate.trim();
  if (startDate !== "" && endDate !== "" && startDate > endDate) {
    errors.startDate = "From cannot be after To";
  }
  return errors;
}

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus-visible:border-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-800";

/**
 * Bank-style search plus Filters panel.
 * Panel edits a local draft; Apply commits it. Escape closes and restores focus.
 * Clear all only resets the draft fields; Apply is still required to commit.
 */
export function FilterBar({
  search,
  onSearchChange,
  applied,
  onApply,
  categories,
}: FilterBarProps) {
  const id = useId();
  const filtersButtonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FilterDraft>(applied);
  const [rangeErrors, setRangeErrors] = useState<RangeErrors>({});

  const activeCount = countActive(applied);
  const minAmountErrorId = `${id}-minAmount-error`;
  const startDateErrorId = `${id}-startDate-error`;

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        setDraft(applied);
        setRangeErrors({});
        filtersButtonRef.current?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, applied]);

  function openPanel() {
    setDraft(applied);
    setRangeErrors({});
    setOpen(true);
  }

  function closePanel() {
    setDraft(applied);
    setRangeErrors({});
    setOpen(false);
    filtersButtonRef.current?.focus();
  }

  function handleApply() {
    const errors = validateRanges(draft);
    if (errors.minAmount !== undefined || errors.startDate !== undefined) {
      setRangeErrors(errors);
      // Focus after paint so aria-describedby is in the DOM for screen readers.
      requestAnimationFrame(() => {
        document
          .getElementById(
            errors.minAmount !== undefined
              ? `${id}-minAmount`
              : `${id}-startDate`,
          )
          ?.focus();
      });
      return;
    }
    setRangeErrors({});
    onApply(draft);
    setOpen(false);
    filtersButtonRef.current?.focus();
  }

  function handleClearAll() {
    setDraft(emptyDraft);
    setRangeErrors({});
  }

  function updateDraft(patch: Partial<FilterDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
    setRangeErrors((prev) => {
      const next = { ...prev };
      if (patch.minAmount !== undefined || patch.maxAmount !== undefined) {
        delete next.minAmount;
      }
      if (patch.startDate !== undefined || patch.endDate !== undefined) {
        delete next.startDate;
      }
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label
            htmlFor={`${id}-search`}
            className="block text-sm font-bold text-slate-800"
          >
            Search
          </label>
          <div className="relative mt-1">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400"
            >
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </span>
            <input
              id={`${id}-search`}
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by transaction description"
              className="w-full rounded-md border border-slate-300 py-2.5 pr-3 pl-9 text-slate-900 focus-visible:border-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-800"
            />
          </div>
        </div>

        <button
          ref={filtersButtonRef}
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={() => {
            if (open) {
              closePanel();
            } else {
              openPanel();
            }
          }}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-navy-800 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-800"
        >
          Filters
          {activeCount > 0 ? (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
              {activeCount}
            </span>
          ) : null}
          <svg
            aria-hidden="true"
            className="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
        </button>
      </div>

      {open ? (
        <div
          id={`${id}-panel`}
          className="rounded-lg border border-slate-200 bg-slate-50 p-4 sm:p-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`${id}-type`}
                className="block text-sm font-bold text-slate-800"
              >
                Transaction type
              </label>
              <select
                id={`${id}-type`}
                value={draft.type}
                onChange={(e) => {
                  const value = e.target.value;
                  updateDraft({
                    type:
                      value === "income" || value === "expense" ? value : "",
                  });
                }}
                className={inputClass}
              >
                <option value="">All types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>

            <div>
              <label
                htmlFor={`${id}-category`}
                className="block text-sm font-bold text-slate-800"
              >
                Category
              </label>
              <select
                id={`${id}-category`}
                value={draft.category}
                onChange={(e) => updateDraft({ category: e.target.value })}
                className={inputClass}
              >
                <option value="">All categories</option>
                {categories.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <fieldset className="sm:col-span-2">
              <legend className="text-sm font-bold text-slate-800">
                Amount range{" "}
                <span className="text-xs font-normal italic text-slate-500">
                  (Amounts are always positive. Use Transaction type to limit
                  income or expense.)
                </span>
              </legend>
              <div className="mt-2 grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor={`${id}-minAmount`}
                    className="block text-xs font-semibold text-slate-600"
                  >
                    From
                  </label>
                  <div className="relative mt-1">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400"
                    >
                      $
                    </span>
                    <input
                      id={`${id}-minAmount`}
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={draft.minAmount}
                      onChange={(e) =>
                        updateDraft({ minAmount: e.target.value })
                      }
                      aria-invalid={rangeErrors.minAmount !== undefined}
                      aria-describedby={
                        rangeErrors.minAmount !== undefined
                          ? minAmountErrorId
                          : undefined
                      }
                      className={`${inputClass} pl-7`}
                    />
                  </div>
                  {rangeErrors.minAmount !== undefined ? (
                    <p
                      id={minAmountErrorId}
                      className="mt-1 text-sm text-red-700"
                    >
                      {rangeErrors.minAmount}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label
                    htmlFor={`${id}-maxAmount`}
                    className="block text-xs font-semibold text-slate-600"
                  >
                    To
                  </label>
                  <div className="relative mt-1">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400"
                    >
                      $
                    </span>
                    <input
                      id={`${id}-maxAmount`}
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={draft.maxAmount}
                      onChange={(e) =>
                        updateDraft({ maxAmount: e.target.value })
                      }
                      className={`${inputClass} pl-7`}
                    />
                  </div>
                </div>
              </div>
            </fieldset>

            <fieldset className="sm:col-span-2">
              <legend className="text-sm font-bold text-slate-800">
                Date range
              </legend>
              <div className="mt-2 grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor={`${id}-startDate`}
                    className="block text-xs font-semibold text-slate-600"
                  >
                    From
                  </label>
                  <input
                    id={`${id}-startDate`}
                    type="date"
                    value={draft.startDate}
                    onChange={(e) =>
                      updateDraft({ startDate: e.target.value })
                    }
                    aria-invalid={rangeErrors.startDate !== undefined}
                    aria-describedby={
                      rangeErrors.startDate !== undefined
                        ? startDateErrorId
                        : undefined
                    }
                    className={inputClass}
                  />
                  {rangeErrors.startDate !== undefined ? (
                    <p
                      id={startDateErrorId}
                      className="mt-1 text-sm text-red-700"
                    >
                      {rangeErrors.startDate}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label
                    htmlFor={`${id}-endDate`}
                    className="block text-xs font-semibold text-slate-600"
                  >
                    To
                  </label>
                  <input
                    id={`${id}-endDate`}
                    type="date"
                    value={draft.endDate}
                    onChange={(e) => updateDraft({ endDate: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
            </fieldset>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClearAll}
              className="px-2 py-2 text-sm font-bold uppercase tracking-wide text-navy-700 underline decoration-dotted underline-offset-4 hover:text-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-800"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={closePanel}
              className="rounded-md border border-navy-700 bg-white px-4 py-2 text-sm font-semibold text-navy-800 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-800"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="rounded-md bg-navy-700 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-800"
            >
              Apply
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

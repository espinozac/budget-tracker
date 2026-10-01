import type { Totals, Transaction } from "@budget/shared";
import {
  formatCurrency,
  formatDate,
  formatDateLong,
  formatSignedAmount,
} from "../lib/format";

type TransactionListProps = {
  transactions: Transaction[];
  isLoading: boolean;
  hasFilters: boolean;
  filteredTotals: Totals | undefined;
  onClearFilters: () => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  isDeleting: boolean;
};

function groupByDate(transactions: Transaction[]): [string, Transaction[]][] {
  const groups = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const existing = groups.get(tx.date);
    if (existing !== undefined) {
      existing.push(tx);
    } else {
      groups.set(tx.date, [tx]);
    }
  }
  return [...groups.entries()];
}

function FilteredTotalsLine({ totals }: { totals: Totals }) {
  return (
    <p
      className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
      aria-live="polite"
    >
      Showing filtered totals:{" "}
      <span className="font-semibold text-emerald-700">
        + {formatCurrency(totals.totalIncome)}
      </span>{" "}
      income,{" "}
      <span className="font-semibold text-slate-900">
        - {formatCurrency(totals.totalExpenses)}
      </span>{" "}
      expenses, net{" "}
      <span className="font-semibold text-slate-900">
        {formatCurrency(totals.netBalance)}
        {totals.netBalance < 0 ? " (negative)" : ""}
      </span>
      .
    </p>
  );
}

/** Transaction table with delete and edit. Income/expense shown by text and sign. */
export function TransactionList({
  transactions,
  isLoading,
  hasFilters,
  filteredTotals,
  onClearFilters,
  onEdit,
  onDelete,
  isDeleting,
}: TransactionListProps) {
  const totalsLine =
    hasFilters && filteredTotals !== undefined ? (
      <FilteredTotalsLine totals={filteredTotals} />
    ) : null;

  if (isLoading && transactions.length === 0) {
    return (
      <div className="space-y-3">
        {totalsLine}
        <p className="rounded-lg border border-slate-200 bg-white px-5 py-8 text-center text-slate-600">
          Loading transactions…
        </p>
      </div>
    );
  }

  if (transactions.length === 0) {
    if (hasFilters) {
      return (
        <div className="space-y-3">
          {totalsLine}
          <div className="rounded-lg border border-slate-200 bg-white px-5 py-8 text-center">
            <p className="text-slate-700">
              No transactions match your filters.
            </p>
            <button
              type="button"
              onClick={onClearFilters}
              className="mt-3 rounded-md bg-navy-800 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-800"
            >
              Clear filters
            </button>
          </div>
        </div>
      );
    }

    return (
      <p className="rounded-lg border border-slate-200 bg-white px-5 py-8 text-center text-slate-600">
        No transactions yet. Add one with the form.
      </p>
    );
  }

  const groups = groupByDate(transactions);

  return (
    <div className="space-y-6">
      {totalsLine}
      {groups.map(([date, rows]) => (
        <section key={date} aria-labelledby={`date-${date}`}>
          <h3
            id={`date-${date}`}
            className="mb-2 text-sm font-semibold text-slate-500"
          >
            {formatDateLong(date)}
          </h3>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[40rem] border-collapse text-left">
              <caption className="sr-only">
                Transactions on {formatDateLong(date)}
              </caption>
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-600"
                  >
                    Description
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-600"
                  >
                    Category
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-600"
                  >
                    Date
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-600"
                  >
                    Type
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-600"
                  >
                    Amount
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-600"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((tx) => {
                  const signed = formatSignedAmount(tx.amount, tx.type);
                  const isIncome = tx.type === "income";
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span
                            aria-hidden="true"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-navy-800 text-sm font-bold text-white"
                          >
                            $
                          </span>
                          <span className="font-bold text-slate-900">
                            {tx.description}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-500">
                        {tx.category}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700">
                        {formatDate(tx.date)}
                      </td>
                      <td className="px-4 py-4 text-sm capitalize text-slate-700">
                        {tx.type}
                      </td>
                      <td
                        className={`px-4 py-4 text-right text-sm font-bold tabular-nums ${
                          isIncome ? "text-emerald-700" : "text-slate-900"
                        }`}
                      >
                        <span className="sr-only">
                          {isIncome ? "Income" : "Expense"}{" "}
                        </span>
                        {signed}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onEdit(tx)}
                            aria-label={`Edit ${tx.description}, ${formatDate(tx.date)}`}
                            className="rounded-md px-2 py-1 text-sm font-semibold text-navy-700 underline decoration-dotted underline-offset-4 hover:text-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-800"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => onDelete(tx)}
                            aria-label={`Delete ${tx.description}, ${formatDate(tx.date)}`}
                            className="rounded-md px-2 py-1 text-sm font-semibold text-navy-700 underline decoration-dotted underline-offset-4 hover:text-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-800 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

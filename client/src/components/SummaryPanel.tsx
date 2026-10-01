import type { Summary } from "@budget/shared";
import { formatCurrency } from "../lib/format";

type SummaryPanelProps = {
  summary: Summary | undefined;
  isLoading: boolean;
};

/** All-time totals panel. A negative balance is labeled, not just colored. */
export function SummaryPanel({ summary, isLoading }: SummaryPanelProps) {
  const income = summary?.totalIncome ?? 0;
  const expenses = summary?.totalExpenses ?? 0;
  const balance = summary?.netBalance ?? 0;
  const balanceNegative = balance < 0;

  return (
    <section
      aria-labelledby="summary-heading"
      className="overflow-hidden rounded-lg border border-slate-200 bg-navy-50"
    >
      <h2 id="summary-heading" className="sr-only">
        Summary
      </h2>
      <dl className="grid gap-0 sm:grid-cols-3">
        <div className="border-b border-slate-200 px-5 py-4 sm:border-b-0 sm:border-r sm:px-6">
          <dt className="text-sm font-bold text-slate-700">Total Income</dt>
          <dd className="mt-1 text-base font-semibold tabular-nums text-emerald-700">
            {isLoading && summary === undefined
              ? "…"
              : `+ ${formatCurrency(income)}`}
          </dd>
        </div>
        <div className="border-b border-slate-200 px-5 py-4 sm:border-b-0 sm:border-r sm:px-6">
          <dt className="text-sm font-bold text-slate-700">Total Expenses</dt>
          <dd className="mt-1 text-base font-semibold tabular-nums text-slate-900">
            {isLoading && summary === undefined
              ? "…"
              : `- ${formatCurrency(expenses)}`}
          </dd>
        </div>
        <div className="px-5 py-4 sm:px-6">
          <dt className="text-sm font-bold text-slate-700">
            Net balance
            {balanceNegative ? (
              <span className="ml-2 font-medium text-slate-600">
                (negative)
              </span>
            ) : null}
          </dt>
          <dd className="mt-1 text-xl font-bold tabular-nums text-slate-900 sm:text-2xl">
            {isLoading && summary === undefined
              ? "…"
              : formatCurrency(balance)}
          </dd>
        </div>
      </dl>
    </section>
  );
}

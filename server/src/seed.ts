import type { TransactionInput } from "@budget/shared";

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Calendar date in this month (offset 0) or last (offset -1); current-month days cap at today. */
function monthDay(today: Date, monthOffset: number, day: number): string {
  const probe = new Date(
    today.getFullYear(),
    today.getMonth() + monthOffset,
    1,
    12,
    0,
    0,
    0,
  );
  const lastDay = new Date(
    probe.getFullYear(),
    probe.getMonth() + 1,
    0,
  ).getDate();
  let capped = Math.min(day, lastDay);
  if (monthOffset === 0) {
    capped = Math.min(capped, today.getDate());
  }
  return formatLocalDate(
    new Date(probe.getFullYear(), probe.getMonth(), capped, 12, 0, 0, 0),
  );
}

/** About 12 sample rows across this month and last, with repeated descriptions. */
export function buildSeedTransactions(
  today: Date = new Date(),
): TransactionInput[] {
  const anchor = new Date(today);
  anchor.setHours(12, 0, 0, 0);

  const thisMonth = (day: number) => monthDay(anchor, 0, day);
  const lastMonth = (day: number) => monthDay(anchor, -1, day);

  return [
    {
      date: thisMonth(28),
      description: "Coffee",
      amount: 4.5,
      type: "expense",
      category: "Food",
    },
    {
      date: thisMonth(22),
      description: "Groceries",
      amount: 62.35,
      type: "expense",
      category: "Food",
    },
    {
      date: thisMonth(18),
      description: "Coffee",
      amount: 5.25,
      type: "expense",
      category: "Food",
    },
    {
      date: thisMonth(15),
      description: "Paycheck",
      amount: 3200,
      type: "income",
      category: "Salary",
    },
    {
      date: thisMonth(10),
      description: "Transit pass",
      amount: 96,
      type: "expense",
      category: "Transport",
    },
    {
      date: thisMonth(3),
      description: "Groceries",
      amount: 48.1,
      type: "expense",
      category: "Food",
    },
    {
      date: lastMonth(28),
      description: "Electric bill",
      amount: 87.4,
      type: "expense",
      category: "Utilities",
    },
    {
      date: lastMonth(22),
      description: "Coffee",
      amount: 3.75,
      type: "expense",
      category: "Food",
    },
    {
      date: lastMonth(18),
      description: "Freelance invoice",
      amount: 750,
      type: "income",
      category: "Side",
    },
    {
      date: lastMonth(12),
      description: "Groceries",
      amount: 55.2,
      type: "expense",
      category: "Food",
    },
    {
      date: lastMonth(8),
      description: "Paycheck",
      amount: 3200,
      type: "income",
      category: "Salary",
    },
    {
      date: lastMonth(2),
      description: "Internet",
      amount: 65,
      type: "expense",
      category: "Utilities",
    },
  ];
}

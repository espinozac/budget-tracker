import type { TransactionType } from "@budget/shared";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const displayDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const longDate = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

/** Format a positive money amount as USD. */
export function formatCurrency(amount: number): string {
  return currency.format(amount);
}

/**
 * Format a YYYY-MM-DD string from its parts (local calendar).
 * Never pass the ISO string to `new Date("YYYY-MM-DD")`.
 */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return displayDate.format(new Date(year, month - 1, day));
}

/** Longer date label for group headers (e.g. "September 29, 2026"). */
export function formatDateLong(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return longDate.format(new Date(year, month - 1, day));
}

/** Today's local calendar date as YYYY-MM-DD (not UTC via toISOString). */
export function todayLocal(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Signed amount with a leading + or - so meaning is not color alone. */
export function formatSignedAmount(
  amount: number,
  type: TransactionType,
): string {
  const formatted = formatCurrency(amount);
  return type === "expense" ? `- ${formatted}` : `+ ${formatted}`;
}

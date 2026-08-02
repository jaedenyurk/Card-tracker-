/** Converts a user-entered dollar amount (e.g. 125.5) to integer cents (12550). */
export function dollarsToCents(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  if (Number.isNaN(n)) return null;
  return Math.round(n * 100);
}

/** Converts integer cents back to a plain dollar number for form inputs. */
export function centsToDollars(cents: number | null | undefined): number | null {
  if (cents == null) return null;
  return Math.round(cents) / 100;
}

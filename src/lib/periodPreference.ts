import type { PeriodKey } from "./calculations";

// Shared across the Dashboard, Revenue, and Expenses pages so picking a
// period on one carries through to the others instead of resetting.
const STORAGE_KEY = "cardTracker.period";

export function readStoredPeriod(): PeriodKey {
  if (typeof window === "undefined") return "MONTH";
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === "MONTH" || value === "YTD" || value === "ALL" ? value : "MONTH";
}

export function writeStoredPeriod(period: PeriodKey): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, period);
  } catch {
    // Private browsing / storage disabled — filter still works for this page load.
  }
}

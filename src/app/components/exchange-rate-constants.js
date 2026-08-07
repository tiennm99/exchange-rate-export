import { subDays, startOfMonth, isSameDay } from "date-fns";

export const CURRENCY_OPTIONS = [
  "ALL", "USD", "EUR", "GBP", "JPY", "AUD",
  "CAD", "CHF", "SGD", "THB", "HKD", "CNY", "KRW",
];

export const DATE_PRESETS = [
  { label: "Today", start: () => new Date(), end: () => new Date() },
  { label: "Last 7 days", start: () => subDays(new Date(), 7), end: () => new Date() },
  { label: "Last 30 days", start: () => subDays(new Date(), 30), end: () => new Date() },
  { label: "This month", start: () => startOfMonth(new Date()), end: () => new Date() },
];

export function getActivePreset(startDate, endDate) {
  if (!startDate || !endDate) return null;
  for (const preset of DATE_PRESETS) {
    if (isSameDay(startDate, preset.start()) && isSameDay(endDate, preset.end())) {
      return preset.label;
    }
  }
  return null;
}

export const THEME_CYCLE = ["system", "light", "dark"];
export const THEME_LABELS = { system: "System", light: "Light", dark: "Dark" };

export function loadFromUrl() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const bank = params.get("bank");
  const currency = params.get("currency");
  const start = params.get("start");
  const end = params.get("end");
  if (!bank && !currency && !start && !end) return null;
  return {
    bank: bank || null,
    currency: currency || null,
    startDate: start ? new Date(start) : null,
    endDate: end ? new Date(end) : null,
  };
}

export function loadSavedSettings() {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem("exchangeRateSettings");
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    return {
      bank: parsed.bank || "bidv",
      currency: parsed.currency || "USD",
      startDate: parsed.startDate ? new Date(parsed.startDate) : null,
      endDate: parsed.endDate ? new Date(parsed.endDate) : null,
    };
  } catch {
    return null;
  }
}

export function saveSettings(bank, currency, startDate, endDate) {
  try {
    localStorage.setItem("exchangeRateSettings", JSON.stringify({
      bank,
      currency,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
    }));
  } catch { /* ignore quota errors */ }
}

export function applyTheme(value) {
  const root = document.documentElement;
  if (value === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", value);
  }
}

"use client";

import React, { useState, useEffect, useCallback } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format, subDays, startOfMonth, isSameDay, differenceInCalendarDays } from "date-fns";
import * as XLSX from "xlsx";
import { LoadingSpinner, ErrorMessage, EmptyState } from "./exchange-rate-status";
import { RateTable, ComparisonTable } from "./exchange-rate-table";
import { RateTrendChart } from "./exchange-rate-chart";

// Read state from URL search params (takes priority over localStorage)
function loadFromUrl() {
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

function loadSavedSettings() {
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

function saveSettings(bank, currency, startDate, endDate) {
  try {
    localStorage.setItem("exchangeRateSettings", JSON.stringify({
      bank,
      currency,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
    }));
  } catch { /* ignore quota errors */ }
}

const CURRENCY_OPTIONS = [
  "ALL", "USD", "EUR", "GBP", "JPY", "AUD",
  "CAD", "CHF", "SGD", "THB", "HKD", "CNY", "KRW",
];

const DATE_PRESETS = [
  { label: "Today", start: () => new Date(), end: () => new Date() },
  { label: "Last 7 days", start: () => subDays(new Date(), 7), end: () => new Date() },
  { label: "Last 30 days", start: () => subDays(new Date(), 30), end: () => new Date() },
  { label: "This month", start: () => startOfMonth(new Date()), end: () => new Date() },
];

function getActivePreset(startDate, endDate) {
  if (!startDate || !endDate) return null;
  for (const preset of DATE_PRESETS) {
    if (isSameDay(startDate, preset.start()) && isSameDay(endDate, preset.end())) {
      return preset.label;
    }
  }
  return null;
}

// Inline SVG icons (16x16) to avoid adding an icon library dependency
function FetchIcon() {
  return (
    <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
    </svg>
  );
}

function ExcelIcon() {
  return (
    <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M10.875 12c-.621 0-1.125.504-1.125 1.125M12 12c.621 0 1.125.504 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0v1.5c0 .621-.504 1.125-1.125 1.125m0 0c-.621 0-1.125.504-1.125 1.125v1.5" />
    </svg>
  );
}

function CsvIcon() {
  return (
    <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

export default function ExchangeRateViewer() {
  const [startDate, setStartDate] = useState(() => subDays(new Date(), 7));
  const [endDate, setEndDate] = useState(() => new Date());
  const [selectedBank, setSelectedBank] = useState("bidv");
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [compareMode, setCompareMode] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [progress, setProgress] = useState(null);

  // Restore saved settings on client mount — URL params take priority over localStorage
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const urlSettings = loadFromUrl();
    const saved = urlSettings || loadSavedSettings();
    if (saved) {
      if (saved.bank) setSelectedBank(saved.bank);
      if (saved.currency) setSelectedCurrency(saved.currency);
      if (saved.startDate) setStartDate(saved.startDate);
      if (saved.endDate) setEndDate(saved.endDate);
    }
    setHydrated(true);
  }, []);

  // Sync state to both localStorage and URL
  useEffect(() => {
    if (!hydrated) return;
    saveSettings(selectedBank, selectedCurrency, startDate, endDate);
    const params = new URLSearchParams();
    params.set("bank", selectedBank);
    params.set("currency", selectedCurrency);
    if (startDate) params.set("start", format(startDate, "yyyy-MM-dd"));
    if (endDate) params.set("end", format(endDate, "yyyy-MM-dd"));
    window.history.replaceState(null, "", `?${params.toString()}`);
  }, [selectedBank, selectedCurrency, startDate, endDate, hydrated]);

  const fetchBank = async (bank) => {
    const response = await fetch("/api/exchange-rates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
        bank,
        currency: selectedCurrency,
      }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to fetch ${bank} rates`);
    }
    return response.json();
  };

  const handleFetch = useCallback(async () => {
    if (!startDate || !endDate) {
      setError("Please select both start and end dates");
      return;
    }
    if (startDate > endDate) {
      setError("Start date cannot be after end date");
      return;
    }
    setError("");
    setIsLoading(true);
    setResults([]);
    setHasFetched(false);
    const totalDays = differenceInCalendarDays(endDate, startDate) + 1;
    setProgress({ current: 0, total: totalDays });
    try {
      if (compareMode) {
        const [bidvData, tcbData] = await Promise.all([fetchBank("bidv"), fetchBank("tcb")]);
        const merged = new Map();
        for (const row of (bidvData.data || [])) {
          const key = `${row.date}|${row.currency}`;
          merged.set(key, { date: row.date, currency: row.currency, bidvBuyTm: row.muaTm, bidvSell: row.ban });
        }
        for (const row of (tcbData.data || [])) {
          const key = `${row.date}|${row.sourceCurrency}`;
          const existing = merged.get(key) || { date: row.date, currency: row.sourceCurrency };
          existing.tcbBidTm = row.bidRateTM;
          existing.tcbAsk = row.askRate;
          merged.set(key, existing);
        }
        setResults(Array.from(merged.values()).sort((a, b) => a.date.localeCompare(b.date)));
      } else {
        const data = await fetchBank(selectedBank);
        setResults(data.data || []);
      }
      setHasFetched(true);
    } catch (err) {
      setError(`An error occurred while fetching exchange rates: ${err.message}`);
      console.error(err);
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  }, [startDate, endDate, selectedBank, selectedCurrency, compareMode]);

  useEffect(() => {
    if (hydrated) handleFetch();
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const getExportRows = () => {
    if (compareMode) {
      const headers = ["Date", "Currency", "BIDV Buy TM", "BIDV Sell", "TCB Bid TM", "TCB Ask"];
      return [headers, ...results.map((r) => [r.date, r.currency, r.bidvBuyTm || "", r.bidvSell || "", r.tcbBidTm || "", r.tcbAsk || ""])];
    }
    if (selectedBank === "bidv") {
      const headers = ["Date", "NameVI", "MuaTm", "MuaCk", "Currency", "NameEN", "Ban"];
      return [headers, ...results.map((r) => [r.date, r.nameVI, r.muaTm, r.muaCk, r.currency, r.nameEN, r.ban])];
    }
    const headers = ["Date", "Label", "AskRate", "BidRateCK", "BidRateTM", "SourceCurrency", "TargetCurrency", "AskRateTM"];
    return [headers, ...results.map((r) => [r.date, r.label, r.askRate, r.bidRateCK, r.bidRateTM, r.sourceCurrency, r.targetCurrency, r.askRateTM])];
  };

  const baseFilename = `exchange_rates_${compareMode ? "compare" : selectedBank}_${selectedCurrency}_${new Date().toISOString().split("T")[0]}`;

  const handleExportExcel = () => {
    if (results.length === 0) return;
    const ws = XLSX.utils.aoa_to_sheet(getExportRows());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Exchange Rates");
    XLSX.writeFile(wb, `${baseFilename}.xlsx`);
  };

  const handleExportCsv = () => {
    if (results.length === 0) return;
    const ws = XLSX.utils.aoa_to_sheet(getExportRows());
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${baseFilename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const activePreset = getActivePreset(startDate, endDate);

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Exchange Rate Export</h1>
        <p className="text-sm mt-1 text-[var(--muted)]">
          Fetch exchange rates from Vietnamese banks and export to CSV.
        </p>
      </div>

      <div
        className="rounded-xl p-5 mb-6 bg-[var(--card-bg)] border border-[var(--card-border)]"
        onKeyDown={(e) => { if (e.key === "Enter" && !isLoading) handleFetch(); }}
      >
        <div className="flex flex-col gap-4">
          {/* Row 1: Selectors and date pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col">
              <label htmlFor="bank" className="text-sm font-medium mb-1.5">Bank</label>
              <select
                id="bank"
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                disabled={compareMode}
                className="border rounded-lg px-3 py-2 text-sm w-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50 bg-[var(--input-bg)] text-[var(--foreground)] border-[var(--input-border)]"
              >
                <option value="bidv">BIDV</option>
                <option value="tcb">Techcombank</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label htmlFor="currency" className="text-sm font-medium mb-1.5">Currency</label>
              <select
                id="currency"
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-[var(--input-bg)] text-[var(--foreground)] border-[var(--input-border)]"
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c === "ALL" ? "All Currencies" : c}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label htmlFor="start-date" className="text-sm font-medium mb-1.5">Start Date</label>
              <DatePicker
                id="start-date"
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                maxDate={endDate || new Date()}
                dateFormat="yyyy-MM-dd"
                className="border rounded-lg px-3 py-2 text-sm w-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                placeholderText="Select start date"
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="end-date" className="text-sm font-medium mb-1.5">End Date</label>
              <DatePicker
                id="end-date"
                selected={endDate}
                onChange={(date) => setEndDate(date)}
                minDate={startDate}
                maxDate={new Date()}
                dateFormat="yyyy-MM-dd"
                className="border rounded-lg px-3 py-2 text-sm w-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                placeholderText="Select end date"
              />
            </div>
          </div>

          {/* Row 2: Toggles and date presets */}
          <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-[var(--card-border)]">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer text-[var(--muted)]">
              <input type="checkbox" checked={compareMode} onChange={(e) => setCompareMode(e.target.checked)} className="rounded" />
              Compare BIDV vs TCB
            </label>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer text-[var(--muted)]">
              <input type="checkbox" checked={showChart} onChange={(e) => setShowChart(e.target.checked)} className="rounded" />
              Show Chart
            </label>
            <span className="text-[var(--card-border)]">|</span>
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={`text-xs px-3 py-1 rounded-md border transition-colors ${
                  activePreset === preset.label
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700 font-medium"
                    : "border-[var(--input-border)] text-[var(--muted)] hover:bg-blue-50 dark:hover:bg-blue-900/20"
                }`}
                onClick={() => { setStartDate(preset.start()); setEndDate(preset.end()); }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Row 3: Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-1">
            <button
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500/40 inline-flex items-center justify-center gap-2"
              onClick={handleFetch}
              disabled={isLoading}
            >
              <FetchIcon />
              {isLoading ? "Fetching..." : "Fetch Rates"}
            </button>
            <button
              className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500/40 inline-flex items-center justify-center gap-2"
              onClick={handleExportExcel}
              disabled={results.length === 0 || isLoading}
            >
              <ExcelIcon />
              Export Excel
            </button>
            <button
              className="text-sm font-medium px-5 py-2 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500/30 inline-flex items-center justify-center gap-2 border-[var(--input-border)] text-[var(--foreground)]"
              onClick={handleExportCsv}
              disabled={results.length === 0 || isLoading}
            >
              <CsvIcon />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      <div aria-live="polite" aria-atomic="true">
        {error && <ErrorMessage message={error} />}
        {isLoading && <LoadingSpinner progress={progress} />}
        {!isLoading && hasFetched && results.length === 0 && <EmptyState />}
        {!isLoading && hasFetched && results.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-[var(--muted)]">
                {results.length} {results.length === 1 ? "record" : "records"} found
              </p>
            </div>
            {showChart && (
              <RateTrendChart results={results} selectedBank={selectedBank} compareMode={compareMode} />
            )}
            {compareMode
              ? <ComparisonTable results={results} />
              : <RateTable results={results} selectedBank={selectedBank} />
            }
          </div>
        )}
      </div>
    </div>
  );
}

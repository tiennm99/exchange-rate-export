"use client";

import React, { useState, useEffect, useCallback } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format, subDays, startOfMonth } from "date-fns";
import * as XLSX from "xlsx";
import { LoadingSpinner, ErrorMessage, EmptyState } from "./exchange-rate-status";
import { RateTable, ComparisonTable } from "./exchange-rate-table";
import { RateTrendChart } from "./exchange-rate-chart";

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

export default function ExchangeRateViewer() {
  const [startDate, setStartDate] = useState(() => loadSavedSettings()?.startDate || subDays(new Date(), 7));
  const [endDate, setEndDate] = useState(() => loadSavedSettings()?.endDate || new Date());
  const [selectedBank, setSelectedBank] = useState(() => loadSavedSettings()?.bank || "bidv");
  const [selectedCurrency, setSelectedCurrency] = useState(() => loadSavedSettings()?.currency || "USD");
  const [compareMode, setCompareMode] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    saveSettings(selectedBank, selectedCurrency, startDate, endDate);
  }, [selectedBank, selectedCurrency, startDate, endDate]);

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
    setProgress(null);
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
    handleFetch();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const inputStyle = {
    background: "var(--input-bg)",
    color: "var(--foreground)",
    borderColor: "var(--input-border)",
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Exchange Rate Export</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Fetch exchange rates from Vietnamese banks and export to CSV.
        </p>
      </div>

      <div
        className="rounded-xl p-5 mb-6"
        style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
        onKeyDown={(e) => { if (e.key === "Enter" && !isLoading) handleFetch(); }}
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col">
              <label htmlFor="bank" className="text-sm font-medium mb-1.5">Bank</label>
              <select
                id="bank"
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                disabled={compareMode}
                className="border rounded-lg px-3 py-2 text-sm w-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50"
                style={inputStyle}
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
                className="border rounded-lg px-3 py-2 text-sm w-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                style={inputStyle}
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

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: "var(--muted)" }}>
              <input type="checkbox" checked={compareMode} onChange={(e) => setCompareMode(e.target.checked)} className="rounded" />
              Compare BIDV vs TCB
            </label>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: "var(--muted)" }}>
              <input type="checkbox" checked={showChart} onChange={(e) => setShowChart(e.target.checked)} className="rounded" />
              Show Chart
            </label>
            <span style={{ color: "var(--card-border)" }}>|</span>
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className="text-xs px-3 py-1 rounded-md border transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20"
                style={{ borderColor: "var(--input-border)", color: "var(--muted)" }}
                onClick={() => { setStartDate(preset.start()); setEndDate(preset.end()); }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex flex-row gap-2 justify-end pt-1">
            <button
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              onClick={handleFetch}
              disabled={isLoading}
            >
              {isLoading ? "Fetching..." : "Fetch Rates"}
            </button>
            <button
              className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              onClick={handleExportExcel}
              disabled={results.length === 0 || isLoading}
            >
              Export Excel
            </button>
            <button
              className="text-sm font-medium px-5 py-2 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              style={{ borderColor: "var(--input-border)", color: "var(--foreground)" }}
              onClick={handleExportCsv}
              disabled={results.length === 0 || isLoading}
            >
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
              <p className="text-sm" style={{ color: "var(--muted)" }}>
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

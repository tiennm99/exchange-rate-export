"use client";

import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format, subDays } from "date-fns";

function LoadingSpinner({ progress }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        <p style={{ color: "var(--muted)" }}>
          {progress ? `Fetching ${progress.current}/${progress.total} days...` : "Fetching exchange rates..."}
        </p>
      </div>
    </div>
  );
}

function ErrorMessage({ message }) {
  return (
    <div
      className="flex items-start gap-2 rounded-lg px-4 py-3 text-sm mb-4"
      style={{
        background: "rgba(239, 68, 68, 0.08)",
        border: "1px solid rgba(239, 68, 68, 0.2)",
        color: "#ef4444",
      }}
    >
      <span className="shrink-0 mt-0.5">&#9888;</span>
      <span>{message}</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12" style={{ color: "var(--muted)" }}>
      <p className="text-lg mb-1">No results yet</p>
      <p className="text-sm">Select a bank and date range, then click Fetch Rates.</p>
    </div>
  );
}

function RateTable({ results, selectedBank }) {
  const bidvHeaders = ["Date", "Name (VI)", "Buy TM", "Buy CK", "Currency", "Name (EN)", "Sell"];
  const tcbHeaders = ["Date", "Label", "Ask Rate", "Bid CK", "Bid TM", "Source", "Target", "Ask TM"];

  const headers = selectedBank === "bidv" ? bidvHeaders : tcbHeaders;

  const getRowCells = (row) => {
    if (selectedBank === "bidv") {
      return [row.date, row.nameVI, row.muaTm, row.muaCk, row.currency, row.nameEN, row.ban];
    }
    return [row.date, row.label, row.askRate, row.bidRateCK, row.bidRateTM, row.sourceCurrency, row.targetCurrency, row.askRateTM];
  };

  return (
    <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid var(--card-border)" }}>
      <table className="min-w-full text-sm">
        <thead>
          <tr style={{ background: "var(--table-header-bg)" }}>
            {headers.map((h) => (
              <th
                key={h}
                className="px-3 py-2.5 text-left font-semibold whitespace-nowrap"
                style={{ borderBottom: "1px solid var(--card-border)" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((row, idx) => (
            <tr
              key={idx}
              className={`transition-colors hover:!bg-[var(--table-row-hover)] ${idx % 2 !== 0 ? "bg-[var(--table-row-stripe)]" : ""}`}
            >
              {getRowCells(row).map((cell, i) => (
                <td
                  key={i}
                  className="px-3 py-2 whitespace-nowrap"
                  style={{ borderBottom: "1px solid var(--card-border)" }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ExchangeRateViewer() {
  const [startDate, setStartDate] = useState(() => subDays(new Date(), 7));
  const [endDate, setEndDate] = useState(() => new Date());
  const [selectedBank, setSelectedBank] = useState("bidv");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [progress, setProgress] = useState(null);

  const handleFetch = async () => {
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
      const response = await fetch("/api/exchange-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: format(startDate, "yyyy-MM-dd"),
          endDate: format(endDate, "yyyy-MM-dd"),
          bank: selectedBank,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch exchange rates");
      }

      // Stream progress from response
      const data = await response.json();
      if (data.total) {
        setProgress({ current: data.total, total: data.total });
      }
      setResults(data.data || []);
      setHasFetched(true);
    } catch (err) {
      setError(`An error occurred while fetching exchange rates: ${err.message}`);
      console.error(err);
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  };

  const escapeCsv = (value) => {
    const str = String(value ?? "");
    const escaped = str.replace(/"/g, '""');
    if (/^[=+\-@\t\r]/.test(escaped)) return `"'${escaped}"`;
    return `"${escaped}"`;
  };

  const handleExport = () => {
    if (results.length === 0) return;
    let csvContent = "";
    let headers = [];
    if (selectedBank === "bidv") {
      headers = ["Date", "NameVI", "MuaTm", "MuaCk", "Currency", "NameEN", "Ban"];
      csvContent = headers.join(",") + "\n";
      csvContent += results
        .map((row) => [row.date, row.nameVI, row.muaTm, row.muaCk, row.currency, row.nameEN, row.ban].map(escapeCsv).join(","))
        .join("\n");
    } else {
      headers = ["Date", "Label", "AskRate", "BidRateCK", "BidRateTM", "SourceCurrency", "TargetCurrency", "AskRateTM"];
      csvContent = headers.join(",") + "\n";
      csvContent += results
        .map((row) => [row.date, row.label, row.askRate, row.bidRateCK, row.bidRateTM, row.sourceCurrency, row.targetCurrency, row.askRateTM].map(escapeCsv).join(","))
        .join("\n");
    }
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `exchange_rates_${selectedBank}_${new Date().toISOString().split("T")[0]}.csv`;
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
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Exchange Rate Export</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Fetch USD exchange rates from Vietnamese banks and export to CSV.
        </p>
      </div>

      {/* Controls card */}
      <div
        className="rounded-xl p-5 mb-6"
        style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
        onKeyDown={(e) => { if (e.key === "Enter" && !isLoading) handleFetch(); }}
      >
        <div className="flex flex-col gap-4">
          {/* Inputs row */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-col w-full sm:w-1/3">
              <label htmlFor="bank" className="text-sm font-medium mb-1.5">
                Bank
              </label>
              <select
                id="bank"
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                style={inputStyle}
              >
                <option value="bidv">BIDV</option>
                <option value="tcb">Techcombank</option>
              </select>
            </div>
            <div className="flex flex-col w-full sm:w-1/3">
              <label htmlFor="start-date" className="text-sm font-medium mb-1.5">
                Start Date
              </label>
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
            <div className="flex flex-col w-full sm:w-1/3">
              <label htmlFor="end-date" className="text-sm font-medium mb-1.5">
                End Date
              </label>
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

          {/* Buttons row */}
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
              onClick={handleExport}
              disabled={results.length === 0 || isLoading}
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Status area - announced to screen readers */}
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
            <RateTable results={results} selectedBank={selectedBank} />
          </div>
        )}
      </div>
    </div>
  );
}

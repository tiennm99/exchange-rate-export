"use client";

import React, { useState, useCallback, memo, useMemo } from "react";
import dynamic from "next/dynamic";
import { parse, isDate, format } from "date-fns";

// Bundle optimization: Dynamic import for heavy date picker
const DatePicker = dynamic(() => import("react-datepicker"), {
  ssr: false,
  loading: () => (
    <div className="h-10 w-full border rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
  ),
});

import "react-datepicker/dist/react-datepicker.css";

// rendering-hoist-jsx: Hoist static SVG icons outside components
// These are recreated on every render if defined inline
const SpinnerIcon = () => (
  <svg
    className="animate-spin h-4 w-4"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

const LoadingIcon = () => (
  <svg
    className="animate-spin h-5 w-5"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

const ErrorIcon = () => (
  <svg
    className="h-5 w-5 flex-shrink-0"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
      clipRule="evenodd"
    />
  </svg>
);

const EmptyDataIcon = () => (
  <svg
    className="mx-auto h-12 w-12 text-gray-400 mb-4"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

// Memoized sub-components for re-render optimization
const ControlPanel = memo(
  ({
    selectedBank,
    setSelectedBank,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    isLoading,
    onFetch,
    onExport,
    canExport,
  }) => {
    return (
      <div className="flex flex-col gap-4 mb-6">
        {/* Row 1: Bank Select & Date Pickers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <BankSelector value={selectedBank} onChange={setSelectedBank} />
          <DateSelector
            label="Start Date"
            date={startDate}
            onChange={setStartDate}
            maxDate={endDate || new Date()}
            placeholderText="Select start date"
          />
          <DateSelector
            label="End Date"
            date={endDate}
            onChange={setEndDate}
            minDate={startDate}
            maxDate={new Date()}
            placeholderText="Select end date"
          />
        </div>

        {/* Row 2: Action Buttons */}
        <div className="flex gap-3 justify-end">
          <FetchButton isLoading={isLoading} onClick={onFetch} />
          <ExportButton disabled={canExport} onClick={onExport} />
        </div>
      </div>
    );
  },
);

ControlPanel.displayName = "ControlPanel";

const BankSelector = memo(({ value, onChange }) => (
  <div className="flex flex-col gap-1.5">
    <label
      htmlFor="bank"
      className="text-sm font-medium text-gray-700 dark:text-gray-300"
    >
      Bank
    </label>
    <select
      id="bank"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-600
                 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                 focus:ring-2 focus:ring-blue-500 focus:border-transparent
                 transition-all duration-200 cursor-pointer
                 hover:border-gray-400 dark:hover:border-gray-500"
    >
      <option value="bidv">BIDV</option>
      <option value="tcb">Techcombank</option>
    </select>
  </div>
));

BankSelector.displayName = "BankSelector";

const DateSelector = memo(
  ({ label, date, onChange, minDate, maxDate, placeholderText }) => (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={`date-${label}`}
        className="text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
      </label>
      <DatePicker
        id={`date-${label}`}
        selected={date}
        onChange={onChange}
        minDate={minDate}
        maxDate={maxDate}
        dateFormat="yyyy-MM-dd"
        className="h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-600
                 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                 focus:ring-2 focus:ring-blue-500 focus:border-transparent
                 transition-all duration-200"
        placeholderText={placeholderText}
      />
    </div>
  ),
);

DateSelector.displayName = "DateSelector";

const FetchButton = memo(({ isLoading, onClick }) => (
  <button
    className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200
               ${
                 isLoading
                   ? "bg-gray-400 cursor-not-allowed"
                   : "bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-md hover:shadow-lg"
               } text-white`}
    onClick={onClick}
    disabled={isLoading}
  >
    {isLoading ? (
      <span className="flex items-center gap-2">
        <SpinnerIcon />
        Fetching...
      </span>
    ) : (
      "Fetch Rates"
    )}
  </button>
));

FetchButton.displayName = "FetchButton";

const ExportButton = memo(({ disabled, onClick }) => (
  <button
    className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200
               ${
                 disabled
                   ? "bg-gray-400 cursor-not-allowed"
                   : "bg-green-600 hover:bg-green-700 active:scale-95 shadow-md hover:shadow-lg"
               } text-white`}
    onClick={onClick}
    disabled={disabled}
  >
    Export CSV
  </button>
));

ExportButton.displayName = "ExportButton";

// Memoized status components
const StatusMessage = memo(({ type, message }) => {
  const styles = useMemo(() => {
    switch (type) {
      case "error":
        return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200";
      case "loading":
        return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200";
      case "success":
        return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200";
      default:
        return "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200";
    }
  }, [type]);

  if (!message) return null;

  return (
    <div
      className={`p-4 rounded-lg border ${styles} mb-4 flex items-center gap-3`}
    >
      {type === "loading" && <LoadingIcon />}
      {type === "error" && <ErrorIcon />}
      <span className="flex-1">{message}</span>
    </div>
  );
});

StatusMessage.displayName = "StatusMessage";

// Improved table component with modern design
const ExchangeRateTable = memo(({ results, bank }) => {
  const columns = useMemo(() => {
    if (bank === "bidv") {
      return [
        { key: "date", label: "Date" },
        { key: "nameVI", label: "Name (VI)" },
        { key: "muaTm", label: "Buy Cash" },
        { key: "muaCk", label: "Buy Transfer" },
        { key: "currency", label: "Currency" },
        { key: "nameEN", label: "Name (EN)" },
        { key: "ban", label: "Sell" },
      ];
    }
    return [
      { key: "date", label: "Date" },
      { key: "label", label: "Label" },
      { key: "askRate", label: "Ask Rate" },
      { key: "bidRateCK", label: "Bid Rate CK" },
      { key: "bidRateTM", label: "Bid Rate TM" },
      { key: "sourceCurrency", label: "Source" },
      { key: "targetCurrency", label: "Target" },
      { key: "askRateTM", label: "Ask Rate TM" },
    ];
  }, [bank]);

  if (!results || results.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
        <EmptyDataIcon />
        <p className="text-gray-500 dark:text-gray-400">No data available</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {results.map((result, idx) => (
              <tr
                key={idx}
                className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap"
                  >
                    {result[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {results.length > 0 && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
          Showing {results.length} {results.length === 1 ? "record" : "records"}
        </div>
      )}
    </div>
  );
});

ExchangeRateTable.displayName = "ExchangeRateTable";

export default function ExchangeRateViewer({
  defaultStartDate,
  defaultEndDate,
}) {
  // Re-render optimization: Lazy state initialization
  const [startDate, setStartDate] = useState(() => {
    if (!defaultStartDate) return null;
    return isDate(defaultStartDate)
      ? defaultStartDate
      : parse(defaultStartDate, "yyyy-MM-dd", new Date());
  });

  const [endDate, setEndDate] = useState(() => {
    if (!defaultEndDate) return null;
    return isDate(defaultEndDate)
      ? defaultEndDate
      : parse(defaultEndDate, "yyyy-MM-dd", new Date());
  });

  const [selectedBank, setSelectedBank] = useState("bidv");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);
  const [showTable, setShowTable] = useState(false);

  // Re-render optimization: Functional setState for stable callbacks
  const handleFetch = useCallback(async () => {
    if (!startDate || !endDate) {
      setError("Please select both start and end dates");
      return;
    }

    const start = startDate;
    const end = endDate;
    if (start > end) {
      setError("Start date cannot be after end date");
      return;
    }

    setError("");
    setIsLoading(true);
    setResults([]);
    setShowTable(false);

    try {
      const response = await fetch("/api/exchange-rates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: format(start, "yyyy-MM-dd"),
          endDate: format(end, "yyyy-MM-dd"),
          bank: selectedBank,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch exchange rates");
      }

      const data = await response.json();
      setResults(data.data || []);
      setShowTable(true);
    } catch (err) {
      setError(`Failed to fetch exchange rates: ${err.message}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, selectedBank]);

  const handleExport = useCallback(() => {
    if (results.length === 0) return;

    let csvContent = "";
    let headers = [];

    if (selectedBank === "bidv") {
      headers = [
        "Date",
        "NameVI",
        "MuaTm",
        "MuaCk",
        "Currency",
        "NameEN",
        "Ban",
      ];
      csvContent = headers.join(",") + "\n";
      csvContent += results
        .map(
          (row) =>
            `"${row.date}","${row.nameVI}","${row.muaTm}","${row.muaCk}","${row.currency}","${row.nameEN}","${row.ban}"`,
        )
        .join("\n");
    } else {
      headers = [
        "Date",
        "Label",
        "AskRate",
        "BidRateCK",
        "BidRateTM",
        "SourceCurrency",
        "TargetCurrency",
        "AskRateTM",
      ];
      csvContent = headers.join(",") + "\n";
      csvContent += results
        .map(
          (row) =>
            `"${row.date}","${row.label}","${row.askRate}","${row.bidRateCK}","${row.bidRateTM}","${row.sourceCurrency}","${row.targetCurrency}","${row.askRateTM}"`,
        )
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
  }, [results, selectedBank]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Exchange Rate Export
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Fetch and export exchange rates from Vietnamese banks
        </p>
      </div>

      {/* Control Panel */}
      <ControlPanel
        selectedBank={selectedBank}
        setSelectedBank={setSelectedBank}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        isLoading={isLoading}
        onFetch={handleFetch}
        onExport={handleExport}
        canExport={results.length === 0 || isLoading}
      />

      {/* Status Messages */}
      <StatusMessage type="error" message={error} />
      <StatusMessage
        type="loading"
        message={isLoading ? "Fetching exchange rates from bank API..." : ""}
      />
      <StatusMessage
        type="success"
        message={
          showTable && !error
            ? `Successfully fetched ${results.length} records`
            : ""
        }
      />

      {/* Results Table */}
      {showTable && !error && (
        <div className="mt-6">
          <ExchangeRateTable results={results} bank={selectedBank} />
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { parse, isDate, format } from "date-fns";

export default function ExchangeRateViewer({
  defaultStartDate,
  defaultEndDate,
}) {
  const [startDate, setStartDate] = useState(
    defaultStartDate
      ? isDate(defaultStartDate)
        ? defaultStartDate
        : parse(defaultStartDate, "yyyy-MM-dd", new Date())
      : null
  );
  const [endDate, setEndDate] = useState(
    defaultEndDate
      ? isDate(defaultEndDate)
        ? defaultEndDate
        : parse(defaultEndDate, "yyyy-MM-dd", new Date())
      : null
  );
  const [selectedBank, setSelectedBank] = useState("bidv");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);
  const [showTable, setShowTable] = useState(false);

  const handleFetch = async () => {
    if (!startDate || !endDate) {
      setError("Please select both start and end dates");
      return;
    }
    setError("");
    setIsLoading(true);
    setResults([]);
    setShowTable(false);
    try {
      const start = startDate;
      const end = endDate;
      if (start > end) {
        setError("Start date cannot be after end date");
        setIsLoading(false);
        return;
      }
      const response = await fetch("/api/exchange-rates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: format(start, 'yyyy-MM-dd'),
          endDate: format(end, 'yyyy-MM-dd'),
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
      setError(
        `An error occurred while fetching exchange rates: ${err.message}`
      );
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
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
            `"${row.date}","${row.nameVI}","${row.muaTm}","${row.muaCk}","${row.currency}","${row.nameEN}","${row.ban}"`
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
            `"${row.date}","${row.label}","${row.askRate}","${row.bidRateCK}","${row.bidRateTM}","${row.sourceCurrency}","${row.targetCurrency}","${row.askRateTM}"`
        )
        .join("\n");
    }
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `exchange_rates_${selectedBank}_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto p-4 max-w-5xl w-full">
      <h1 className="text-2xl font-bold mb-4">Exchange Rate Export</h1>
      <div className="flex flex-col gap-4 mb-4">
        {/* Row 1: Start & End Date Pickers and Bank Select */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="form-group flex flex-col w-full sm:w-1/3">
            <label htmlFor="bank" className="mb-1">
              Bank:
            </label>
            <select
              id="bank"
              value={selectedBank}
              onChange={(e) => setSelectedBank(e.target.value)}
              className="border rounded p-2 w-full theme-select"
              style={{
                background: "var(--background)",
                color: "var(--foreground)",
              }}
            >
              <option value="bidv">BIDV</option>
              <option value="tcb">Techcombank</option>
            </select>
          </div>
          <div className="form-group flex flex-col w-full sm:w-1/3">
            <label htmlFor="start-date" className="mb-1">
              Start Date:
            </label>
            <DatePicker
              id="start-date"
              selected={startDate}
              onChange={(date) => setStartDate(date)}
              maxDate={endDate || new Date()}
              dateFormat="yyyy-MM-dd"
              className="border rounded p-2 w-full"
              placeholderText="Select start date"
            />
          </div>
          <div className="form-group flex flex-col w-full sm:w-1/3">
            <label htmlFor="end-date" className="mb-1">
              End Date:
            </label>
            <DatePicker
              id="end-date"
              selected={endDate}
              onChange={(date) => setEndDate(date)}
              minDate={startDate}
              maxDate={new Date()}
              dateFormat="yyyy-MM-dd"
              className="border rounded p-2 w-full"
              placeholderText="Select end date"
            />
          </div>
        </div>
        {/* Row 2: Fetch & Export Buttons aligned with End Date */}
        <div className="flex flex-row gap-2 justify-end items-end">
          <button
            className="fetch-btn bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
            onClick={handleFetch}
            disabled={isLoading}
            style={{ marginBottom: 0 }}
          >
            {isLoading ? "Fetching..." : "Fetch Rates"}
          </button>
          <button
            className="export-btn bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
            onClick={handleExport}
            disabled={results.length === 0 || isLoading}
            style={{ marginBottom: 0 }}
          >
            Export CSV
          </button>
        </div>
      </div>
      {error && <div className="error text-red-600 mb-2">{error}</div>}
      {isLoading && (
        <div className="loading mb-2">Loading data, please wait...</div>
      )}
      {showTable && (
        <div className="table-container overflow-x-auto mt-4">
          {selectedBank === "bidv" ? (
            <table className="min-w-full border border-gray-300">
              <thead>
                <tr>
                  <th className="border px-2 py-1">Date</th>
                  <th className="border px-2 py-1">NameVI</th>
                  <th className="border px-2 py-1">MuaTm</th>
                  <th className="border px-2 py-1">MuaCk</th>
                  <th className="border px-2 py-1">Currency</th>
                  <th className="border px-2 py-1">NameEN</th>
                  <th className="border px-2 py-1">Ban</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, idx) => (
                  <tr key={idx}>
                    <td className="border px-2 py-1">{result.date}</td>
                    <td className="border px-2 py-1">{result.nameVI}</td>
                    <td className="border px-2 py-1">{result.muaTm}</td>
                    <td className="border px-2 py-1">{result.muaCk}</td>
                    <td className="border px-2 py-1">{result.currency}</td>
                    <td className="border px-2 py-1">{result.nameEN}</td>
                    <td className="border px-2 py-1">{result.ban}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="min-w-full border border-gray-300">
              <thead>
                <tr>
                  <th className="border px-2 py-1">Date</th>
                  <th className="border px-2 py-1">Label</th>
                  <th className="border px-2 py-1">AskRate</th>
                  <th className="border px-2 py-1">BidRateCK</th>
                  <th className="border px-2 py-1">BidRateTM</th>
                  <th className="border px-2 py-1">SourceCurrency</th>
                  <th className="border px-2 py-1">TargetCurrency</th>
                  <th className="border px-2 py-1">AskRateTM</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, idx) => (
                  <tr key={idx}>
                    <td className="border px-2 py-1">{result.date}</td>
                    <td className="border px-2 py-1">{result.label}</td>
                    <td className="border px-2 py-1">{result.askRate}</td>
                    <td className="border px-2 py-1">{result.bidRateCK}</td>
                    <td className="border px-2 py-1">{result.bidRateTM}</td>
                    <td className="border px-2 py-1">
                      {result.sourceCurrency}
                    </td>
                    <td className="border px-2 py-1">
                      {result.targetCurrency}
                    </td>
                    <td className="border px-2 py-1">{result.askRateTM}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

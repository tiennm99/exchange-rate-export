"use client";

import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { parse, isDate } from 'date-fns';

export default function ExchangeRateViewer({ defaultStartDate, defaultEndDate }) {
  const [startDate, setStartDate] = useState(
    defaultStartDate ? (isDate(defaultStartDate) ? defaultStartDate : parse(defaultStartDate, 'yyyy-MM-dd', new Date())) : null
  );
  const [endDate, setEndDate] = useState(
    defaultEndDate ? (isDate(defaultEndDate) ? defaultEndDate : parse(defaultEndDate, 'yyyy-MM-dd', new Date())) : null
  );
  const [selectedBank, setSelectedBank] = useState('bidv');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState([]);
  const [showTable, setShowTable] = useState(false);

  const handleFetch = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }
    setError('');
    setIsLoading(true);
    setResults([]);
    setShowTable(false);
    try {
      const start = startDate;
      const end = endDate;
      if (start > end) {
        setError('Start date cannot be after end date');
        setIsLoading(false);
        return;
      }
      const response = await fetch('/api/exchange-rates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
          bank: selectedBank
        })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch exchange rates');
      }
      const data = await response.json();
      setResults(data.data || []);
      setShowTable(true);
    } catch (err) {
      setError(`An error occurred while fetching exchange rates: ${err.message}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    if (results.length === 0) return;
    let csvContent = '';
    let headers = [];
    if (selectedBank === 'bidv') {
      headers = ['Date', 'Currency', 'Buy Cash', 'Buy Transfer', 'Sell', 'Name VI', 'Name EN'];
      csvContent = headers.join(',') + '\n';
      csvContent += results.map(row =>
        `"${row.date}","${row.currency}","${row.muaTm}","${row.muaCk}","${row.ban}","${row.nameVI}","${row.nameEN}"`
      ).join('\n');
    } else {
      headers = ['Date', 'Label', 'Ask Rate', 'Bid Rate CK', 'Bid Rate TM', 'Ask Rate TM', 'From', 'To'];
      csvContent = headers.join(',') + '\n';
      csvContent += results.map(row =>
        `"${row.date}","${row.label}","${row.askRate}","${row.bidRateCK}","${row.bidRateTM}","${row.askRateTM}","${row.sourceCurrency}","${row.targetCurrency}"`
      ).join('\n');
    }
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `exchange_rates_${selectedBank}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-4">Exchange Rate Export</h1>
      <div className="controls grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="form-group flex flex-col">
          <label htmlFor="bank" className="mb-1">Bank:</label>
          <select id="bank" value={selectedBank} onChange={e => setSelectedBank(e.target.value)} className="border rounded p-2">
            <option value="bidv">BIDV</option>
            <option value="tcb">Techcombank</option>
          </select>
        </div>
        <div className="form-group flex flex-col">
          <label htmlFor="start-date" className="mb-1">Start Date:</label>
          <DatePicker
            id="start-date"
            selected={startDate}
            onChange={date => setStartDate(date)}
            maxDate={endDate || new Date()}
            dateFormat="yyyy-MM-dd"
            className="border rounded p-2"
            placeholderText="Select start date"
          />
        </div>
        <div className="form-group flex flex-col">
          <label htmlFor="end-date" className="mb-1">End Date:</label>
          <DatePicker
            id="end-date"
            selected={endDate}
            onChange={date => setEndDate(date)}
            minDate={startDate}
            maxDate={new Date()}
            dateFormat="yyyy-MM-dd"
            className="border rounded p-2"
            placeholderText="Select end date"
          />
        </div>
        <div className="button-group flex gap-2 items-end">
          <button className="fetch-btn bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50" onClick={handleFetch} disabled={isLoading}>
            {isLoading ? 'Fetching...' : 'Fetch Rates'}
          </button>
          <button
            className="export-btn bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
            onClick={handleExport}
            disabled={results.length === 0 || isLoading}
          >
            Export CSV
          </button>
        </div>
      </div>
      {error && <div className="error text-red-600 mb-2">{error}</div>}
      {isLoading && <div className="loading mb-2">Loading data, please wait...</div>}
      {showTable && (
        <div className="table-container overflow-x-auto mt-4">
          {selectedBank === 'bidv' ? (
            <table className="min-w-full border border-gray-300">
              <thead>
                <tr>
                  <th className="border px-2 py-1">Date</th>
                  <th className="border px-2 py-1">Currency</th>
                  <th className="border px-2 py-1">Buy Cash</th>
                  <th className="border px-2 py-1">Buy Transfer</th>
                  <th className="border px-2 py-1">Sell</th>
                  <th className="border px-2 py-1">Name (VI)</th>
                  <th className="border px-2 py-1">Name (EN)</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, idx) => (
                  <tr key={idx}>
                    <td className="border px-2 py-1">{result.date}</td>
                    <td className="border px-2 py-1">{result.currency}</td>
                    <td className="border px-2 py-1">{result.muaTm}</td>
                    <td className="border px-2 py-1">{result.muaCk}</td>
                    <td className="border px-2 py-1">{result.ban}</td>
                    <td className="border px-2 py-1">{result.nameVI}</td>
                    <td className="border px-2 py-1">{result.nameEN}</td>
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
                  <th className="border px-2 py-1">Ask Rate</th>
                  <th className="border px-2 py-1">Bid Rate CK</th>
                  <th className="border px-2 py-1">Bid Rate TM</th>
                  <th className="border px-2 py-1">Ask Rate TM</th>
                  <th className="border px-2 py-1">From</th>
                  <th className="border px-2 py-1">To</th>
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
                    <td className="border px-2 py-1">{result.askRateTM}</td>
                    <td className="border px-2 py-1">{result.sourceCurrency}</td>
                    <td className="border px-2 py-1">{result.targetCurrency}</td>
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
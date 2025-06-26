"use client";
import { useState } from "react";

export default function TcbPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  function formatDate(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  function getDateRange(start, end) {
    const dates = [];
    let current = new Date(start);
    const last = new Date(end);
    while (current <= last) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }

  async function fetchUSD(dateObj) {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const dd = String(dateObj.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const url = `https://techcombank.com/content/techcombank/web/vn/vi/cong-cu-tien-ich/ty-gia/_jcr_content.exchange-rates.${dateStr}.integration.json`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      if (!data.exchangeRate || !data.exchangeRate.data) return null;
      const usd = data.exchangeRate.data.find((item) => item.label === "USD (50,100)");
      if (!usd) return null;
      return {
        date: formatDate(dateObj),
        label: usd.label,
        askRate: usd.askRate,
        bidRateCK: usd.bidRateCK,
        bidRateTM: usd.bidRateTM,
        askRateTM: usd.askRateTM,
        sourceCurrency: usd.sourceCurrency,
        targetCurrency: usd.targetCurrency,
      };
    } catch (e) {
      return null;
    }
  }

  function renderTable(data) {
    return (
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 24, display: data.length ? "" : "none" }}>
        <thead>
          <tr>
            <th>Date</th>
            <th>label</th>
            <th>askRate</th>
            <th>bidRateCK</th>
            <th>bidRateTM</th>
            <th>askRateTM</th>
            <th>sourceCurrency</th>
            <th>targetCurrency</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td>{row.date}</td>
              <td>{row.label}</td>
              <td>{row.askRate || ""}</td>
              <td>{row.bidRateCK || ""}</td>
              <td>{row.bidRateTM || ""}</td>
              <td>{row.askRateTM || ""}</td>
              <td>{row.sourceCurrency}</td>
              <td>{row.targetCurrency}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  function exportCSV(data) {
    const header = ["Date", "label", "askRate", "bidRateCK", "bidRateTM", "askRateTM", "sourceCurrency", "targetCurrency"];
    const rows = [header];
    for (const row of data) {
      rows.push([
        row.date,
        row.label,
        row.askRate,
        row.bidRateCK,
        row.bidRateTM,
        row.askRateTM,
        row.sourceCurrency,
        row.targetCurrency,
      ]);
    }
    const csvContent = rows
      .map((r) => r.map((cell) => '"' + String(cell || "").replace(/"/g, '""') + '"').join(","))
      .join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "usd_exchange_rates_tcb.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleFetch() {
    if (!startDate || !endDate) {
      setStatus("<div class='error'>Please select both start and end dates.</div>");
      return;
    }
    if (startDate > endDate) {
      setStatus("<div class='error'>Start date must be before or equal to end date.</div>");
      return;
    }
    setStatus("<div class='loading'>Fetching data, please wait...</div>");
    setLoading(true);
    setResults([]);
    const dates = getDateRange(startDate, endDate);
    const newResults = [];
    for (let i = 0; i < dates.length; i++) {
      const dateObj = dates[i];
      const dateStr = formatDate(dateObj);
      setStatus(`<div class='loading'>Fetching: ${dateStr} (${i + 1}/${dates.length})</div>`);
      const usd = await fetchUSD(dateObj);
      if (usd) {
        newResults.push(usd);
        setResults([...newResults]);
      }
    }
    setStatus(newResults.length ? "" : "<div class='error'>No data found for the selected range.</div>");
    setLoading(false);
  }

  return (
    <div style={{ background: "#fff", padding: 24, borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.07)", maxWidth: 700, margin: "auto" }}>
      <h1>Exchange Rate Export (USD, Techcombank)</h1>
      <div style={{ marginBottom: 20 }}>
        <label htmlFor="start-date">Start Date:</label>
        <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        <label htmlFor="end-date">End Date:</label>
        <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        <button onClick={handleFetch} disabled={loading}>Fetch</button>
        <button onClick={() => exportCSV(results)} disabled={!results.length}>Export CSV</button>
      </div>
      <div dangerouslySetInnerHTML={{ __html: status }} />
      {renderTable(results)}
    </div>
  );
} 
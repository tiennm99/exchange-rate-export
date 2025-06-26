"use client";
import { useState } from "react";

export default function BidvPage() {
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

  async function fetchNamerecord(dateStr) {
    const url = "https://bidv.com.vn/ServicesBIDV/ExchangeDetailSearchTimeServlet";
    const payload = `date=${encodeURIComponent(dateStr)}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: payload,
      });
      if (!res.ok) throw new Error("API 1 error");
      const data = await res.json();
      if (data.status !== 1 || !data.data || !data.data.length) return null;
      let latest = data.data[0];
      for (const rec of data.data) {
        if (rec.time > latest.time) latest = rec;
      }
      return latest.namerecord;
    } catch (e) {
      return null;
    }
  }

  async function fetchUSD(dateStr, namerecord) {
    const url = "https://bidv.com.vn/ServicesBIDV/ExchangeDetailServlet";
    const payload = `date=${encodeURIComponent(dateStr)}&time=${namerecord}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: payload,
      });
      if (!res.ok) throw new Error("API 2 error");
      const data = await res.json();
      if (data.status !== 1 || !data.data) return null;
      const usd = data.data.find((item) => item.currency === "USD");
      if (!usd) return null;
      return {
        nameVI: usd.nameVI,
        muaTm: usd.muaTm,
        muaCk: usd.muaCk,
        currency: usd.currency,
        nameEN: usd.nameEN,
        ban: usd.ban,
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
            <th>nameVI</th>
            <th>muaTm</th>
            <th>muaCk</th>
            <th>currency</th>
            <th>nameEN</th>
            <th>ban</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td>{row.date}</td>
              <td>{row.nameVI}</td>
              <td>{row.muaTm}</td>
              <td>{row.muaCk}</td>
              <td>{row.currency}</td>
              <td>{row.nameEN}</td>
              <td>{row.ban}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  function exportCSV(data) {
    const header = ["Date", "nameVI", "muaTm", "muaCk", "currency", "nameEN", "ban"];
    const rows = [header];
    for (const row of data) {
      rows.push([
        row.date,
        row.nameVI,
        row.muaTm,
        row.muaCk,
        row.currency,
        row.nameEN,
        row.ban,
      ]);
    }
    const csvContent = rows
      .map((r) => r.map((cell) => '"' + String(cell).replace(/"/g, '""') + '"').join(","))
      .join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "usd_exchange_rates.csv";
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
      const namerecord = await fetchNamerecord(dateStr);
      if (!namerecord) continue;
      const usd = await fetchUSD(dateStr, namerecord);
      if (usd) {
        newResults.push({ date: dateStr, ...usd });
        setResults([...newResults]);
      }
    }
    setStatus(newResults.length ? "" : "<div class='error'>No data found for the selected range.</div>");
    setLoading(false);
  }

  return (
    <div style={{ background: "#fff", padding: 24, borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.07)", maxWidth: 700, margin: "auto" }}>
      <h1>Exchange Rate Export (USD)</h1>
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
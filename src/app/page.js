"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [bank, setBank] = useState("bidv");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  function handleBankChange(e) {
    setBank(e.target.value);
    if (e.target.value === "bidv") {
      router.push("/bidv");
    } else if (e.target.value === "tcb") {
      router.push("/tcb");
    }
  }

  return (
    <div style={{ background: "#fff", padding: 24, borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.07)", maxWidth: 700, margin: "auto" }}>
      <h1>Exchange Rate Export (USD)</h1>
      <div style={{ marginBottom: 20 }}>
        <label htmlFor="start-date">Start Date:</label>
        <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        <label htmlFor="end-date">End Date:</label>
        <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        <button onClick={() => router.push(`/${bank}`)} disabled={!startDate || !endDate}>Go</button>
        <label htmlFor="bank-select">Bank:</label>
        <select id="bank-select" value={bank} onChange={handleBankChange}>
          <option value="bidv">BIDV</option>
          <option value="tcb">Techcombank</option>
        </select>
      </div>
      <div style={{ color: '#888', textAlign: 'center', marginTop: 40 }}>
        Select a bank and date range, then click Go to view and export exchange rates.
      </div>
    </div>
  );
}

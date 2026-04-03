"use client";

import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// Parse rate string to number (handles comma-separated values like "25,880")
function parseRate(val) {
  if (!val) return null;
  const num = parseFloat(String(val).replace(/,/g, ""));
  return isNaN(num) ? null : num;
}

export function RateTrendChart({ results, selectedBank, compareMode }) {
  // Build chart data from results
  const chartData = [];

  if (compareMode) {
    // Group by date, show BIDV sell vs TCB ask
    const byDate = new Map();
    for (const row of results) {
      if (!byDate.has(row.date)) byDate.set(row.date, {});
      const entry = byDate.get(row.date);
      entry.date = row.date;
      if (row.bidvSell) entry["BIDV Sell"] = parseRate(row.bidvSell);
      if (row.tcbAsk) entry["TCB Ask"] = parseRate(row.tcbAsk);
    }
    chartData.push(...byDate.values());
  } else if (selectedBank === "bidv") {
    const byDate = new Map();
    for (const row of results) {
      if (!byDate.has(row.date)) byDate.set(row.date, { date: row.date });
      const entry = byDate.get(row.date);
      const label = row.currency || "USD";
      entry[`${label} Buy`] = parseRate(row.muaTm);
      entry[`${label} Sell`] = parseRate(row.ban);
    }
    chartData.push(...byDate.values());
  } else {
    const byDate = new Map();
    for (const row of results) {
      if (!byDate.has(row.date)) byDate.set(row.date, { date: row.date });
      const entry = byDate.get(row.date);
      const label = row.sourceCurrency || "USD";
      entry[`${label} Bid`] = parseRate(row.bidRateTM);
      entry[`${label} Ask`] = parseRate(row.askRate);
    }
    chartData.push(...byDate.values());
  }

  if (chartData.length === 0) return null;

  // Collect all numeric keys for lines
  const lineKeys = new Set();
  for (const row of chartData) {
    for (const key of Object.keys(row)) {
      if (key !== "date" && typeof row[key] === "number") lineKeys.add(key);
    }
  }

  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

  return (
    <div
      className="rounded-lg p-4 mb-4"
      style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
    >
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            tickLine={false}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          {lineKeys.size <= 8 && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {Array.from(lineKeys).map((key, i) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colors[i % colors.length]}
              strokeWidth={2}
              dot={chartData.length <= 31}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

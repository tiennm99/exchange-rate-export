"use client";

import React from "react";

export function ComparisonTable({ results }) {
  const headers = [
    { label: "Date", numeric: false },
    { label: "Currency", numeric: false },
    { label: "BIDV Buy TM", numeric: true },
    { label: "BIDV Sell", numeric: true },
    { label: "TCB Bid TM", numeric: true },
    { label: "TCB Ask", numeric: true },
  ];

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--card-border)]">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="bg-[var(--table-header-bg)]">
            {headers.map((h) => (
              <th
                key={h.label}
                className={`px-3 py-2.5 font-semibold whitespace-nowrap border-b border-[var(--card-border)] ${h.numeric ? "text-right" : "text-left"}`}
              >
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((row, idx) => {
            const cells = [
              { value: row.date, numeric: false },
              { value: row.currency, numeric: false },
              { value: row.bidvBuyTm, numeric: true },
              { value: row.bidvSell, numeric: true },
              { value: row.tcbBidTm, numeric: true },
              { value: row.tcbAsk, numeric: true },
            ];
            return (
              <tr
                key={idx}
                className={`transition-colors hover:!bg-[var(--table-row-hover)] ${idx % 2 !== 0 ? "bg-[var(--table-row-stripe)]" : ""}`}
              >
                {cells.map((cell, i) => (
                  <td
                    key={i}
                    className={`px-3 py-2 whitespace-nowrap border-b border-[var(--card-border)] ${cell.numeric ? "text-right tabular-nums" : ""}`}
                  >
                    {cell.value || "-"}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function RateTable({ results, selectedBank }) {
  const bidvHeaders = [
    { label: "Date", numeric: false },
    { label: "Name (VI)", numeric: false },
    { label: "Buy TM", numeric: true },
    { label: "Buy CK", numeric: true },
    { label: "Currency", numeric: false },
    { label: "Name (EN)", numeric: false },
    { label: "Sell", numeric: true },
  ];
  const tcbHeaders = [
    { label: "Date", numeric: false },
    { label: "Label", numeric: false },
    { label: "Ask Rate", numeric: true },
    { label: "Bid CK", numeric: true },
    { label: "Bid TM", numeric: true },
    { label: "Source", numeric: false },
    { label: "Target", numeric: false },
    { label: "Ask TM", numeric: true },
  ];

  const headers = selectedBank === "bidv" ? bidvHeaders : tcbHeaders;

  const getRowCells = (row) => {
    if (selectedBank === "bidv") {
      return [
        { value: row.date, numeric: false },
        { value: row.nameVI, numeric: false },
        { value: row.muaTm, numeric: true },
        { value: row.muaCk, numeric: true },
        { value: row.currency, numeric: false },
        { value: row.nameEN, numeric: false },
        { value: row.ban, numeric: true },
      ];
    }
    return [
      { value: row.date, numeric: false },
      { value: row.label, numeric: false },
      { value: row.askRate, numeric: true },
      { value: row.bidRateCK, numeric: true },
      { value: row.bidRateTM, numeric: true },
      { value: row.sourceCurrency, numeric: false },
      { value: row.targetCurrency, numeric: false },
      { value: row.askRateTM, numeric: true },
    ];
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--card-border)]">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="bg-[var(--table-header-bg)]">
            {headers.map((h) => (
              <th
                key={h.label}
                className={`px-3 py-2.5 font-semibold whitespace-nowrap border-b border-[var(--card-border)] ${h.numeric ? "text-right" : "text-left"}`}
              >
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((row, idx) => {
            const cells = getRowCells(row);
            return (
              <tr
                key={idx}
                className={`transition-colors hover:!bg-[var(--table-row-hover)] ${idx % 2 !== 0 ? "bg-[var(--table-row-stripe)]" : ""}`}
              >
                {cells.map((cell, i) => (
                  <td
                    key={i}
                    className={`px-3 py-2 whitespace-nowrap border-b border-[var(--card-border)] ${cell.numeric ? "text-right tabular-nums" : ""}`}
                  >
                    {cell.value}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

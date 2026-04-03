"use client";

import React from "react";

export function ComparisonTable({ results }) {
  const headers = ["Date", "Currency", "BIDV Buy TM", "BIDV Sell", "TCB Bid TM", "TCB Ask"];

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
              {[row.date, row.currency, row.bidvBuyTm, row.bidvSell, row.tcbBidTm, row.tcbAsk].map((cell, i) => (
                <td
                  key={i}
                  className="px-3 py-2 whitespace-nowrap"
                  style={{ borderBottom: "1px solid var(--card-border)" }}
                >
                  {cell || "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RateTable({ results, selectedBank }) {
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

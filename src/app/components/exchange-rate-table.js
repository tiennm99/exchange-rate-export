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
    <>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto rounded-lg border border-[var(--card-border)]">
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
      {/* Mobile cards */}
      <div className="sm:hidden flex flex-col gap-2">
        {results.map((row, idx) => (
          <div key={idx} className="rounded-lg border border-[var(--card-border)] p-3 bg-[var(--card-bg)] text-sm">
            <div className="flex justify-between mb-1.5">
              <span className="font-medium">{row.date}</span>
              <span className="text-[var(--muted)]">{row.currency}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div className="flex justify-between"><span className="text-[var(--muted)]">BIDV Buy</span><span className="tabular-nums">{row.bidvBuyTm || "-"}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">TCB Bid</span><span className="tabular-nums">{row.tcbBidTm || "-"}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">BIDV Sell</span><span className="tabular-nums">{row.bidvSell || "-"}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">TCB Ask</span><span className="tabular-nums">{row.tcbAsk || "-"}</span></div>
            </div>
          </div>
        ))}
      </div>
    </>
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

  const getMobileCard = (row) => {
    if (selectedBank === "bidv") {
      return { title: row.nameVI || row.nameEN, subtitle: `${row.currency} - ${row.date}`, fields: [
        { label: "Buy TM", value: row.muaTm }, { label: "Buy CK", value: row.muaCk }, { label: "Sell", value: row.ban },
      ]};
    }
    return { title: row.label, subtitle: `${row.sourceCurrency} - ${row.date}`, fields: [
      { label: "Bid TM", value: row.bidRateTM }, { label: "Bid CK", value: row.bidRateCK },
      { label: "Ask", value: row.askRate }, { label: "Ask TM", value: row.askRateTM },
    ]};
  };

  return (
    <>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto rounded-lg border border-[var(--card-border)]">
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
      {/* Mobile cards */}
      <div className="sm:hidden flex flex-col gap-2">
        {results.map((row, idx) => {
          const card = getMobileCard(row);
          return (
            <div key={idx} className="rounded-lg border border-[var(--card-border)] p-3 bg-[var(--card-bg)] text-sm">
              <div className="flex justify-between mb-1.5">
                <span className="font-medium">{card.title}</span>
                <span className="text-[var(--muted)] text-xs">{card.subtitle}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {card.fields.map((f, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-[var(--muted)]">{f.label}</span>
                    <span className="tabular-nums">{f.value || "-"}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

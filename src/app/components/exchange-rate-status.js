"use client";

import React from "react";

export function LoadingSpinner({ progress }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        <p style={{ color: "var(--muted)" }}>
          {progress ? `Fetching ${progress.current}/${progress.total} days...` : "Fetching exchange rates..."}
        </p>
      </div>
    </div>
  );
}

export function ErrorMessage({ message }) {
  return (
    <div
      className="flex items-start gap-2 rounded-lg px-4 py-3 text-sm mb-4"
      style={{
        background: "rgba(239, 68, 68, 0.08)",
        border: "1px solid rgba(239, 68, 68, 0.2)",
        color: "#ef4444",
      }}
    >
      <span className="shrink-0 mt-0.5">&#9888;</span>
      <span>{message}</span>
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="text-center py-12" style={{ color: "var(--muted)" }}>
      <p className="text-lg mb-1">No results yet</p>
      <p className="text-sm">Select a bank and date range, then click Fetch Rates.</p>
    </div>
  );
}

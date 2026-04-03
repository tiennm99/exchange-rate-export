"use client";

import React from "react";

export function LoadingSpinner({ progress }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-[var(--muted)]">
          {progress ? `Fetching ${progress.current}/${progress.total} days...` : "Fetching exchange rates..."}
        </p>
      </div>
    </div>
  );
}

export function ErrorMessage({ message }) {
  return (
    <div className="flex items-start gap-2 rounded-lg px-4 py-3 text-sm mb-4 bg-red-50 dark:bg-red-950 border border-red-500/20 text-red-500">
      <svg aria-hidden="true" className="shrink-0 mt-0.5 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
      <span>{message}</span>
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="text-center py-16 text-[var(--muted)]">
      <svg aria-hidden="true" className="mx-auto mb-4 w-12 h-12 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v-5.5m3 5.5V8.25" />
      </svg>
      <p className="text-lg font-medium mb-1">No exchange rate data</p>
      <p className="text-sm">Select a bank and date range, then click Fetch Rates to get started.</p>
    </div>
  );
}

"use client";
import React from "react";
import ExchangeRateViewer from "./components/ExchangeRateViewer";
import { format, subDays } from "date-fns";

// async-dependencies: Compute default dates during module initialization
// This eliminates the useEffect waterfall and avoids unnecessary re-renders
const getInitialDates = () => {
  const today = new Date();
  const weekAgo = subDays(today, 7);
  return {
    defaultStartDate: format(weekAgo, "yyyy-MM-dd"),
    defaultEndDate: format(today, "yyyy-MM-dd"),
  };
};

const { defaultStartDate, defaultEndDate } = getInitialDates();

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 font-[family-name:var(--font-geist-sans)]">
      <main className="w-full">
        <ExchangeRateViewer
          defaultStartDate={defaultStartDate}
          defaultEndDate={defaultEndDate}
        />
      </main>
    </div>
  );
}

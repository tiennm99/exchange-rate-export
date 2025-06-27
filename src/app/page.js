"use client";
import React, { useEffect, useState } from "react";
import ExchangeRateViewer from "./components/ExchangeRateViewer";
import { format, subDays } from "date-fns";

export default function Home() {
  const [defaultStartDate, setDefaultStartDate] = useState("");
  const [defaultEndDate, setDefaultEndDate] = useState("");

  useEffect(() => {
    const today = new Date();
    const weekAgo = subDays(today, 7);
    setDefaultStartDate(format(weekAgo, "yyyy-MM-dd"));
    setDefaultEndDate(format(today, "yyyy-MM-dd"));
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 sm:p-20 bg-background text-foreground font-[family-name:var(--font-geist-sans)]">
      <main className="w-full flex flex-col items-center">
        {defaultStartDate && defaultEndDate && (
          <ExchangeRateViewer
            defaultStartDate={defaultStartDate}
            defaultEndDate={defaultEndDate}
          />
        )}
      </main>
    </div>
  );
}

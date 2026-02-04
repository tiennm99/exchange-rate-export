"use client";

import { SpeedInsights } from "@vercel/speed-insights/next";
import dynamic from "next/dynamic";
import React from "react";

// bundle-defer-third-party: Defer analytics until after hydration
// This prevents analytics from blocking initial page render
const Analytics = dynamic(
  () =>
    import("@vercel/analytics/react").then((mod) => ({
      default: mod.Analytics,
    })),
  {
    ssr: false,
  },
);

// SpeedInsights needs to be wrapped in a client component that renders it conditionally
function SpeedInsightsWrapper() {
  // Use a simple trick to defer rendering until after hydration
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <SpeedInsights />;
}

export default function AnalyticsWrapper() {
  return (
    <>
      <Analytics />
      <SpeedInsightsWrapper />
    </>
  );
}

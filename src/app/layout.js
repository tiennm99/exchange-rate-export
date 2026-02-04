import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import dynamic from "next/dynamic";

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

const SpeedInsights = dynamic(
  () =>
    import("@vercel/speed-insights/next").then((mod) => ({
      default: mod.default,
    })),
  {
    ssr: false,
  },
);

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Exchange Rate Export | Vietnamese Bank Rates",
  description:
    "Fetch and export historical exchange rates from Vietnamese banks including BIDV and Techcombank. Download exchange rate data in CSV format for analysis and reporting.",
  keywords: [
    "exchange rate",
    "Vietnam",
    "BIDV",
    "Techcombank",
    "currency",
    "export",
    "CSV",
  ],
  authors: [{ name: "Exchange Rate Export" }],
  openGraph: {
    title: "Exchange Rate Export | Vietnamese Bank Rates",
    description:
      "Fetch and export historical exchange rates from Vietnamese banks",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

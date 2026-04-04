import { format } from "date-fns";
import axios from "axios";
import https from "https";
import crypto from "crypto";

const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
  }),
});

const DISPLAY_DATE_FORMAT = "yyyy-MM-dd";
const PARALLEL_CHUNK_SIZE = 5;
const MAX_RETRIES = 2;
const INITIAL_BACKOFF_MS = 500;

// Retry a function with exponential backoff
async function withRetry(fn, retries = MAX_RETRIES) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === retries) throw error;
      const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

async function fetchBIDVRates(dateObj, currency) {
  const dateStr = format(dateObj, "dd/MM/yyyy");
  try {
    const timeUrl = `https://bidv.com.vn/ServicesBIDV/ExchangeDetailSearchTimeServlet?date=${dateStr}`;
    const timeRes = await withRetry(() => axiosInstance.get(timeUrl));
    const timeData = timeRes.data;
    if (timeData.status !== 1 || !timeData.data?.length) return null;

    const latest = timeData.data.reduce(
      (best, current) => (current.time > best.time ? current : best),
      timeData.data[0]
    );

    const rateUrl = `https://bidv.com.vn/ServicesBIDV/ExchangeDetailServlet?date=${dateStr}&time=${latest.namerecord}`;
    const rateRes = await withRetry(() => axiosInstance.get(rateUrl));
    const rateData = rateRes.data;
    if (rateData.status !== 1 || !rateData.data) return null;

    const displayDate = format(dateObj, DISPLAY_DATE_FORMAT);
    const items = currency === "ALL"
      ? rateData.data
      : rateData.data.filter((item) => item.currency === currency);
    if (items.length === 0) return null;

    return items.map((item) => ({
      date: displayDate,
      nameVI: item.nameVI || "",
      muaTm: item.muaTm || "",
      muaCk: item.muaCk || "",
      currency: item.currency || "",
      nameEN: item.nameEN || "",
      ban: item.ban || "",
    }));
  } catch (error) {
    console.error("Error fetching BIDV rates:", error.message);
    return null;
  }
}

async function fetchTCBRates(dateObj, currency) {
  const dateStr = format(dateObj, "yyyy-MM-dd");
  const url = `https://techcombank.com/content/techcombank/web/vn/vi/cong-cu-tien-ich/ty-gia/_jcr_content.exchange-rates.${dateStr}.integration.json`;
  try {
    const res = await withRetry(() => axiosInstance.get(url));
    const data = res.data;
    if (!data.exchangeRate?.data) return null;

    const items = currency === "ALL"
      ? data.exchangeRate.data
      : data.exchangeRate.data.filter((item) => item.sourceCurrency === currency);
    if (items.length === 0) return null;

    return items.map((item) => ({
      date: dateStr,
      label: item.label || "",
      askRate: item.askRate || "",
      bidRateCK: item.bidRateCK || "",
      bidRateTM: item.bidRateTM || "",
      sourceCurrency: item.sourceCurrency || "",
      targetCurrency: item.targetCurrency || "",
      askRateTM: item.askRateTM || "",
    }));
  } catch (error) {
    console.error("Error fetching TCB rates:", error.message);
    return null;
  }
}

function fetchRateForDate(dateObj, bank, currency) {
  return bank === "bidv" ? fetchBIDVRates(dateObj, currency) : fetchTCBRates(dateObj, currency);
}

function getDateRange(start, end) {
  const dates = [];
  let current = new Date(start);
  const last = new Date(end);
  while (current <= last) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// Search backwards for the most recent available rate
async function getPreviousDayRate(date, bank, currency, rateCache, maxAttempts = 30) {
  let currentDate = new Date(date);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    currentDate.setDate(currentDate.getDate() - 1);
    const dateStr = format(currentDate, "yyyy-MM-dd");

    if (rateCache.has(dateStr)) {
      return rateCache.get(dateStr);
    }

    const rates = await fetchRateForDate(currentDate, bank, currency);
    if (rates) {
      rateCache.set(dateStr, rates);
      return rates;
    }
  }
  return null;
}

// Fetch a chunk of dates in parallel, filling gaps with previous day data
async function fetchChunk(dates, bank, currency, rateCache) {
  const settled = await Promise.allSettled(
    dates.map((date) => fetchRateForDate(date, bank, currency))
  );

  const results = [];
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const dateStr = format(date, "yyyy-MM-dd");
    const outcome = settled[i];
    let rates = outcome.status === "fulfilled" ? outcome.value : null;

    if (rates) {
      rateCache.set(dateStr, rates);
      results.push(...rates);
    } else {
      // Weekend/holiday/error — fill with most recent available rate
      const prevRates = await getPreviousDayRate(date, bank, currency, rateCache);
      if (prevRates) {
        const displayDate = format(date, DISPLAY_DATE_FORMAT);
        results.push(...prevRates.map((r) => ({ ...r, date: displayDate })));
      }
    }
  }
  return results;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { startDate, endDate, bank, currency = "USD" } = body;
    if (!startDate || !endDate || !bank) {
      return Response.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const dates = getDateRange(startDate, endDate);
    const rateCache = new Map();
    const results = [];

    // Process dates in parallel chunks to avoid overwhelming upstream APIs
    for (let i = 0; i < dates.length; i += PARALLEL_CHUNK_SIZE) {
      const chunk = dates.slice(i, i + PARALLEL_CHUNK_SIZE);
      const chunkResults = await fetchChunk(chunk, bank, currency, rateCache);
      results.push(...chunkResults);
    }

    return Response.json({ data: results, total: dates.length, chunks: Math.ceil(dates.length / PARALLEL_CHUNK_SIZE) });
  } catch (error) {
    console.error("Server error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

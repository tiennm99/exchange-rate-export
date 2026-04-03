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

async function fetchBIDVRates(dateObj) {
  const dateStr = format(dateObj, "dd/MM/yyyy");
  try {
    const timeUrl = `https://bidv.com.vn/ServicesBIDV/ExchangeDetailSearchTimeServlet?date=${dateStr}`;
    const timeRes = await axiosInstance.get(timeUrl);
    const timeData = timeRes.data;
    if (timeData.status !== 1 || !timeData.data?.length) return null;

    const latest = timeData.data.reduce(
      (best, current) => (current.time > best.time ? current : best),
      timeData.data[0]
    );

    const rateUrl = `https://bidv.com.vn/ServicesBIDV/ExchangeDetailServlet?date=${dateStr}&time=${latest.namerecord}`;
    const rateRes = await axiosInstance.get(rateUrl);
    const rateData = rateRes.data;
    if (rateData.status !== 1 || !rateData.data) return null;

    const usd = rateData.data.find((item) => item.currency === "USD");
    if (!usd) return null;
    return {
      date: format(dateObj, DISPLAY_DATE_FORMAT),
      nameVI: usd.nameVI || "",
      muaTm: usd.muaTm || "",
      muaCk: usd.muaCk || "",
      currency: usd.currency || "USD",
      nameEN: usd.nameEN || "",
      ban: usd.ban || "",
    };
  } catch (error) {
    console.error("Error fetching BIDV rates:", error.message);
    return null;
  }
}

async function fetchTCBRates(dateObj) {
  const dateStr = format(dateObj, "yyyy-MM-dd");
  const url = `https://techcombank.com/content/techcombank/web/vn/vi/cong-cu-tien-ich/ty-gia/_jcr_content.exchange-rates.${dateStr}.integration.json`;
  try {
    const res = await axiosInstance.get(url);
    const data = res.data;
    if (!data.exchangeRate?.data) return null;

    const usd = data.exchangeRate.data.find(
      (item) => item.label === "USD (50,100)"
    );
    if (!usd) return null;
    return {
      date: dateStr,
      label: usd.label || "",
      askRate: usd.askRate || "",
      bidRateCK: usd.bidRateCK || "",
      bidRateTM: usd.bidRateTM || "",
      sourceCurrency: usd.sourceCurrency || "",
      targetCurrency: usd.targetCurrency || "",
      askRateTM: usd.askRateTM || "",
    };
  } catch (error) {
    console.error("Error fetching TCB rates:", error.message);
    return null;
  }
}

function fetchRateForDate(dateObj, bank) {
  return bank === "bidv" ? fetchBIDVRates(dateObj) : fetchTCBRates(dateObj);
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
async function getPreviousDayRate(date, bank, rateCache, maxAttempts = 30) {
  let currentDate = new Date(date);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    currentDate.setDate(currentDate.getDate() - 1);
    const dateStr = format(currentDate, "yyyy-MM-dd");

    if (rateCache.has(dateStr)) {
      return rateCache.get(dateStr);
    }

    const rate = await fetchRateForDate(currentDate, bank);
    if (rate) {
      rateCache.set(dateStr, rate);
      return rate;
    }
  }
  return null;
}

// Fetch a chunk of dates in parallel, filling gaps with previous day data
async function fetchChunk(dates, bank, rateCache) {
  const settled = await Promise.allSettled(
    dates.map((date) => fetchRateForDate(date, bank))
  );

  const results = [];
  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const dateStr = format(date, "yyyy-MM-dd");
    const outcome = settled[i];
    let rate = outcome.status === "fulfilled" ? outcome.value : null;

    if (rate) {
      rateCache.set(dateStr, rate);
      results.push(rate);
    } else {
      // Weekend/holiday/error — fill with most recent available rate
      const prevRate = await getPreviousDayRate(date, bank, rateCache);
      if (prevRate) {
        results.push({ ...prevRate, date: format(date, DISPLAY_DATE_FORMAT) });
      }
    }
  }
  return results;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { startDate, endDate, bank } = body;
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
      const chunkResults = await fetchChunk(chunk, bank, rateCache);
      results.push(...chunkResults);
    }

    return Response.json({ data: results, total: dates.length });
  } catch (error) {
    console.error("Server error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

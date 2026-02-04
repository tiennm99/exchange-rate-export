import { format } from "date-fns";
import axios from "axios";
import https from "https";
import crypto from "crypto";

// Configure axios with legacy SSL support
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
  }),
});

// Helper function to fetch BIDV exchange rates
async function fetchBIDVRates(dateObj) {
  const dateStr = format(dateObj, "dd/MM/yyyy");
  try {
    // First API call to get namerecord
    const timeUrl = `https://bidv.com.vn/ServicesBIDV/ExchangeDetailSearchTimeServlet?date=${dateStr}`;
    const timeRes = await axiosInstance.get(timeUrl);
    const timeData = timeRes.data;
    if (timeData.status !== 1 || !timeData.data?.length) return null;
    // Get the latest record
    const latest = timeData.data.reduce(
      (latest, current) => (current.time > latest.time ? current : latest),
      timeData.data[0],
    );
    // Second API call to get exchange rates
    const rateUrl = `https://bidv.com.vn/ServicesBIDV/ExchangeDetailServlet?date=${dateStr}&time=${latest.namerecord}`;
    const rateRes = await axiosInstance.get(rateUrl);
    const rateData = rateRes.data;
    if (rateData.status !== 1 || !rateData.data) return null;
    // Find USD data
    const usd = rateData.data.find((item) => item.currency === "USD");
    if (!usd) return null;
    return {
      date: dateStr,
      nameVI: usd.nameVI || "",
      muaTm: usd.muaTm || "",
      muaCk: usd.muaCk || "",
      currency: usd.currency || "USD",
      nameEN: usd.nameEN || "",
      ban: usd.ban || "",
    };
  } catch (error) {
    console.error("Error fetching BIDV rates:", error);
    return null;
  }
}

// Helper function to fetch TCB exchange rates
async function fetchTCBRates(dateObj) {
  const dateStr = format(dateObj, "yyyy-MM-dd");
  const url = `https://techcombank.com/content/techcombank/web/vn/vi/cong-cu-tien-ich/ty-gia/_jcr_content.exchange-rates.${dateStr}.integration.json`;
  try {
    const res = await axiosInstance.get(url);
    const data = res.data;
    if (!data.exchangeRate?.data) return null;
    // Find USD data
    const usd = data.exchangeRate.data.find(
      (item) => item.label === "USD (50,100)",
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
    console.error("Error fetching TCB rates:", error);
    return null;
  }
}

// Get date range between start and end dates
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

// Helper function to get previous business day rate with recursive search
async function getPreviousDayRate(date, bank, rateCache, maxAttempts = 30) {
  let currentDate = new Date(date);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    currentDate.setDate(currentDate.getDate() - 1);
    const dateStr = format(currentDate, "yyyy-MM-dd");

    // Try to find in cache first
    if (rateCache.has(dateStr)) {
      return rateCache.get(dateStr);
    }

    // Fetch from API
    let rate = null;
    try {
      if (bank === "bidv") {
        rate = await fetchBIDVRates(currentDate);
      } else if (bank === "tcb") {
        rate = await fetchTCBRates(currentDate);
      }

      if (rate) {
        rateCache.set(dateStr, rate);
        return rate;
      }
    } catch (error) {
      console.error(`Error fetching rates for ${dateStr}:`, error);
    }
  }

  return null;
}

export async function POST(request) {
  try {
    // async-api-routes: Start promises early, await late
    const bodyPromise = request.json();

    // Start validation in parallel with body parsing
    const validateAndParse = async () => {
      const body = await bodyPromise;
      const { startDate, endDate, bank } = body;
      if (!startDate || !endDate || !bank) {
        throw new Error("Missing required parameters");
      }
      return { startDate, endDate, bank };
    };

    let parsed;
    try {
      parsed = await validateAndParse();
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { startDate, endDate, bank } = parsed;
    const dates = getDateRange(startDate, endDate);

    // async-parallel: Fetch all dates in parallel instead of sequential for-loop
    const fetchPromises = dates.map(async (date) => {
      const dateStr = format(date, "yyyy-MM-dd");

      try {
        let rate = null;
        if (bank === "bidv") {
          rate = await fetchBIDVRates(date);
        } else if (bank === "tcb") {
          rate = await fetchTCBRates(date);
        }

        if (rate) {
          return { rate, dateStr, success: true };
        } else {
          // No data for this date (likely weekend), try to get previous day's data
          const rateCache = new Map(); // Local cache for this request
          const prevRate = await getPreviousDayRate(date, bank, rateCache);
          if (prevRate) {
            return {
              rate: {
                ...prevRate,
                date: bank === "bidv" ? format(date, "dd/MM/yyyy") : dateStr,
              },
              dateStr,
              success: true,
            };
          }
          return { rate: null, dateStr, success: false };
        }
      } catch (error) {
        console.error(`Error fetching rates for ${date}:`, error);
        // Try to fill with previous day's data even on error
        const rateCache = new Map();
        const prevRate = await getPreviousDayRate(date, bank, rateCache);
        if (prevRate) {
          return {
            rate: {
              ...prevRate,
              date: bank === "bidv" ? format(date, "dd/MM/yyyy") : dateStr,
            },
            dateStr,
            success: true,
          };
        }
        return { rate: null, dateStr, success: false };
      }
    });

    // Wait for all parallel fetches to complete
    const results = await Promise.all(fetchPromises);

    // Filter successful results and extract rates
    const data = results.filter((r) => r.success && r.rate).map((r) => r.rate);

    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Server error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

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
      timeData.data[0]
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
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    
    
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
    const body = await request.json();
    const { startDate, endDate, bank } = body;
    if (!startDate || !endDate || !bank) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const dates = getDateRange(startDate, endDate);
    const results = [];
    const rateCache = new Map(); // Cache to store rates we've fetched
    
    for (const date of dates) {
      let rate = null;
      const dateStr = format(date, 'yyyy-MM-dd');
      
      
      try {
        if (bank === "bidv") {
          rate = await fetchBIDVRates(date);
        } else if (bank === "tcb") {
          rate = await fetchTCBRates(date);
        }
        
        if (rate) {
          results.push(rate);
          rateCache.set(dateStr, rate);
        } else {
          // No data for this date (likely weekend), try to get previous day's data
          const prevRate = await getPreviousDayRate(date, bank, rateCache);
          if (prevRate) {
            // Create a new rate object with current date but previous day's data
            const filledRate = {
              ...prevRate,
              date: bank === "bidv" ? format(date, 'dd/MM/yyyy') : dateStr
            };
            results.push(filledRate);
          } else {
          }
        }
      } catch (error) {
        console.error(`Error fetching rates for ${date}:`, error);
        // Try to fill with previous day's data even on error
        const prevRate = await getPreviousDayRate(date, bank, rateCache);
        if (prevRate) {
          const filledRate = {
            ...prevRate,
            date: bank === "bidv" ? format(date, 'dd/MM/yyyy') : dateStr
          };
          results.push(filledRate);
        }
      }
    }
    return new Response(JSON.stringify({ data: results }), {
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

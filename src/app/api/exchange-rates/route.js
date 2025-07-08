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
    console.log("[BIDV] Request URL:", timeUrl);
    const timeRes = await axiosInstance.get(timeUrl);
    console.log("[BIDV] Response:", JSON.stringify(timeRes.data));
    const timeData = timeRes.data;
    if (timeData.status !== 1 || !timeData.data?.length) return null;
    // Get the latest record
    const latest = timeData.data.reduce(
      (latest, current) => (current.time > latest.time ? current : latest),
      timeData.data[0]
    );
    // Second API call to get exchange rates
    const rateUrl = `https://bidv.com.vn/ServicesBIDV/ExchangeDetailServlet?date=${dateStr}&time=${latest.namerecord}`;
    console.log("[BIDV] Request URL:", rateUrl);
    const rateRes = await axiosInstance.get(rateUrl);
    console.log("[BIDV] Response:", JSON.stringify(rateRes.data));
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
    console.log("[TCB] Request URL:", url);
    const res = await axiosInstance.get(url);
    console.log("[TCB] Response:", JSON.stringify(res.data));
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

export async function POST(request) {
  try {
    const body = await request.json();
    console.log("[POST] Payload:", JSON.stringify(body));
    const { startDate, endDate, bank } = body;
    if (!startDate || !endDate || !bank) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const dates = getDateRange(startDate, endDate);
    const results = [];
    for (const date of dates) {
      let rate = null;
      try {
        if (bank === "bidv") {
          rate = await fetchBIDVRates(date);
        } else if (bank === "tcb") {
          rate = await fetchTCBRates(date);
        }
        if (rate) {
          results.push(rate);
        }
      } catch (error) {
        console.error(`Error fetching rates for ${date}:`, error);
      }
    }
    console.log("[POST] Response:", JSON.stringify({ data: results }));
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

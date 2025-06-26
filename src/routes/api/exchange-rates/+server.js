import { json } from '@sveltejs/kit';
import { format, parse } from 'date-fns';

// Helper function to fetch BIDV exchange rates
async function fetchBIDVRates(dateObj) {
  const dateStr = format(dateObj, 'dd/MM/yyyy');
  
  try {
    // First API call to get namerecord
    const timeRes = await fetch('https://bidv.com.vn/ServicesBIDV/ExchangeDetailSearchTimeServlet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `date=${encodeURIComponent(dateStr)}`
    });
    
    if (!timeRes.ok) throw new Error('Failed to fetch BIDV time data');
    const timeData = await timeRes.json();
    
    if (timeData.status !== 1 || !timeData.data?.length) return null;
    
    // Get the latest record
    const latest = timeData.data.reduce((latest, current) => 
      current.time > latest.time ? current : latest, timeData.data[0]);
    
    // Second API call to get exchange rates
    const rateRes = await fetch('https://bidv.com.vn/ServicesBIDV/ExchangeDetailServlet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `date=${encodeURIComponent(dateStr)}&time=${latest.namerecord}`
    });
    
    if (!rateRes.ok) throw new Error('Failed to fetch BIDV rate data');
    const rateData = await rateRes.json();
    
    if (rateData.status !== 1 || !rateData.data) return null;
    
    // Find USD data
    const usd = rateData.data.find(item => item.currency === 'USD');
    if (!usd) return null;
    
    return {
      date: dateStr,
      nameVI: usd.nameVI || '',
      muaTm: usd.muaTm || '',
      muaCk: usd.muaCk || '',
      currency: usd.currency || 'USD',
      nameEN: usd.nameEN || '',
      ban: usd.ban || ''
    };
  } catch (error) {
    console.error('Error fetching BIDV rates:', error);
    return null;
  }
}

// Helper function to fetch TCB exchange rates
async function fetchTCBRates(dateObj) {
  const dateStr = format(dateObj, 'yyyy-MM-dd');
  const url = `https://techcombank.com/content/techcombank/web/vn/vi/cong-cu-tien-ich/ty-gia/_jcr_content.exchange-rates.${dateStr}.integration.json`;
  
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch TCB data');
  
  const data = await res.json();
  if (!data.exchangeRate?.data) return null;
  
  // Find USD data
  const usd = data.exchangeRate.data.find(item => item.label === 'USD (50,100)');
  if (!usd) return null;
  
  return {
    date: dateStr,
    label: usd.label || '',
    askRate: usd.askRate || '',
    bidRateCK: usd.bidRateCK || '',
    bidRateTM: usd.bidRateTM || '',
    askRateTM: usd.askRateTM || '',
    sourceCurrency: usd.sourceCurrency || 'USD',
    targetCurrency: usd.targetCurrency || 'VND'
  };
};

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

export async function POST({ request }) {
  try {
    const { startDate, endDate, bank } = await request.json();
    
    if (!startDate || !endDate || !bank) {
      return json({ error: 'Missing required parameters' }, { status: 400 });
    }
    
    const dates = getDateRange(new Date(startDate), new Date(endDate));
    const results = [];
    
    for (const date of dates) {
      let rate = null;
      
      try {
        if (bank === 'bidv') {
          rate = await fetchBIDVRates(date);
        } else if (bank === 'tcb') {
          rate = await fetchTCBRates(date);
        }
        
        if (rate) {
          results.push(rate);
        }
      } catch (error) {
        console.error(`Error fetching rates for ${date}:`, error);
        // Continue with next date even if one fails
      }
    }
    
    return json({ data: results });
  } catch (error) {
    console.error('Server error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

<script>
  import { format } from 'date-fns';

  // Props
  export let defaultStartDate = '';
  export let defaultEndDate = '';

  // State
  let startDate = defaultStartDate;
  let endDate = defaultEndDate;
  let selectedBank = 'bidv'; // 'bidv' or 'tcb'
  let isLoading = false;
  let error = '';
  let results = [];
  let showTable = false;



  // Format date for display
  const formatDisplayDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // Get date range between start and end dates
  const getDateRange = (start, end) => {
    const dates = [];
    let current = new Date(start);
    const last = new Date(end);
    
    while (current <= last) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  };

  // Format date for API requests
  const formatDateForApi = (date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Fetch BIDV exchange rates
  const fetchBIDVRates = async (dateObj) => {
    const dateStr = format(dateObj, 'dd/MM/yyyy');
    
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
  };

  // Fetch TCB exchange rates
  const fetchTCBRates = async (dateObj) => {
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
      date: formatDisplayDate(dateStr),
      label: usd.label || '',
      askRate: usd.askRate || '',
      bidRateCK: usd.bidRateCK || '',
      bidRateTM: usd.bidRateTM || '',
      askRateTM: usd.askRateTM || '',
      sourceCurrency: usd.sourceCurrency || 'USD',
      targetCurrency: usd.targetCurrency || 'VND'
    };
  };

  // Handle fetch button click
  const handleFetch = async () => {
    if (!startDate || !endDate) {
      error = 'Please select both start and end dates';
      return;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      error = 'Start date must be before end date';
      return;
    }
    
    const dateRange = getDateRange(start, end);
    if (dateRange.length > 31) {
      error = 'Date range cannot exceed 31 days';
      return;
    }
    
    isLoading = true;
    error = '';
    results = [];
    showTable = false;
    
    try {
      const fetchPromises = dateRange.map(async (date) => {
        try {
          if (selectedBank === 'bidv') {
            return await fetchBIDVRates(date);
          } else {
            return await fetchTCBRates(date);
          }
        } catch (e) {
          console.error(`Error fetching data for ${date}:`, e);
          return null;
        }
      });
      
      const fetchedResults = await Promise.all(fetchPromises);
      results = fetchedResults.filter(Boolean);
      showTable = results.length > 0;
      
      if (results.length === 0) {
        error = 'No data found for the selected date range';
      }
    } catch (e) {
      console.error('Error fetching data:', e);
      error = 'An error occurred while fetching data. Please try again.';
    } finally {
      isLoading = false;
    }
  };

  // Handle export to CSV
  const handleExport = () => {
    if (results.length === 0) return;
    
    let csvContent = '';
    let headers = [];
    
    if (selectedBank === 'bidv') {
      headers = ['Date', 'Currency', 'Buy Cash', 'Buy Transfer', 'Sell', 'Name VI', 'Name EN'];
      csvContent = headers.join(',') + '\n';
      csvContent += results.map(row => 
        `"${row.date}","${row.currency}","${row.muaTm}","${row.muaCk}","${row.ban}","${row.nameVI}","${row.nameEN}"`
      ).join('\n');
    } else {
      headers = ['Date', 'Label', 'Ask Rate', 'Bid Rate CK', 'Bid Rate TM', 'Ask Rate TM', 'From', 'To'];
      csvContent = headers.join(',') + '\n';
      csvContent += results.map(row => 
        `"${row.date}","${row.label}","${row.askRate}","${row.bidRateCK}","${row.bidRateTM}","${row.askRateTM}","${row.sourceCurrency}","${row.targetCurrency}"`
      ).join('\n');
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `exchange_rates_${selectedBank}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
</script>

<div class="container">
  <h1>Exchange Rate Export</h1>
  
  <div class="controls">
    <div class="form-group">
      <label for="bank">Bank:</label>
      <select id="bank" bind:value={selectedBank}>
        <option value="bidv">BIDV</option>
        <option value="tcb">Techcombank</option>
      </select>
    </div>
    
    <div class="form-group">
      <label for="start-date">Start Date:</label>
      <input 
        type="date" 
        id="start-date" 
        bind:value={startDate}
        max={endDate}
      >
    </div>
    
    <div class="form-group">
      <label for="end-date">End Date:</label>
      <input 
        type="date" 
        id="end-date" 
        bind:value={endDate}
        min={startDate}
        max={new Date().toISOString().split('T')[0]}
      >
    </div>
    
    <div class="button-group">
      <button class="fetch-btn" on:click={handleFetch} disabled={isLoading}>
        {isLoading ? 'Fetching...' : 'Fetch Rates'}
      </button>
      <button 
        class="export-btn" 
        on:click={handleExport} 
        disabled={results.length === 0 || isLoading}
      >
        Export CSV
      </button>
    </div>
  </div>
  
  {#if error}
    <div class="error">{error}</div>
  {/if}
  
  {#if isLoading}
    <div class="loading">Loading data, please wait...</div>
  {/if}
  
  {#if showTable}
    <div class="table-container">
      {#if selectedBank === 'bidv'}
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Currency</th>
              <th>Buy Cash</th>
              <th>Buy Transfer</th>
              <th>Sell</th>
              <th>Name (VI)</th>
              <th>Name (EN)</th>
            </tr>
          </thead>
          <tbody>
            {#each results as result}
              <tr>
                <td>{result.date}</td>
                <td>{result.currency}</td>
                <td>{result.muaTm}</td>
                <td>{result.muaCk}</td>
                <td>{result.ban}</td>
                <td>{result.nameVI}</td>
                <td>{result.nameEN}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {:else}
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Label</th>
              <th>Ask Rate</th>
              <th>Bid Rate CK</th>
              <th>Bid Rate TM</th>
              <th>Ask Rate TM</th>
              <th>From</th>
              <th>To</th>
            </tr>
          </thead>
          <tbody>
            {#each results as result}
              <tr>
                <td>{result.date}</td>
                <td>{result.label}</td>
                <td>{result.askRate}</td>
                <td>{result.bidRateCK}</td>
                <td>{result.bidRateTM}</td>
                <td>{result.askRateTM}</td>
                <td>{result.sourceCurrency}</td>
                <td>{result.targetCurrency}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  {/if}
</div>

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    font-family: Arial, sans-serif;
  }
  
  h1 {
    text-align: center;
    margin-bottom: 2rem;
    color: #2c3e50;
  }
  
  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 2rem;
    align-items: flex-end;
  }
  
  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  label {
    font-weight: 600;
    color: #2c3e50;
  }
  
  input[type="date"],
  select {
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
  }
  
  .button-group {
    display: flex;
    gap: 1rem;
    margin-left: auto;
  }
  
  button {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .fetch-btn {
    background-color: #3498db;
    color: white;
  }
  
  .fetch-btn:hover:not(:disabled) {
    background-color: #2980b9;
  }
  
  .export-btn {
    background-color: #2ecc71;
    color: white;
  }
  
  .export-btn:hover:not(:disabled) {
    background-color: #27ae60;
  }
  
  button:disabled {
    background-color: #bdc3c7;
    cursor: not-allowed;
  }
  
  .error {
    color: #e74c3c;
    background-color: #fadbd8;
    padding: 1rem;
    border-radius: 4px;
    margin-bottom: 1rem;
    text-align: center;
  }
  
  .loading {
    text-align: center;
    color: #3498db;
    margin: 2rem 0;
    font-size: 1.2rem;
  }
  
  .table-container {
    overflow-x: auto;
    margin-top: 2rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border-radius: 8px;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
    background: white;
  }
  
  th, td {
    padding: 0.75rem 1rem;
    text-align: left;
    border-bottom: 1px solid #ecf0f1;
  }
  
  th {
    background-color: #3498db;
    color: white;
    font-weight: 600;
  }
  
  tr:nth-child(even) {
    background-color: #f8f9fa;
  }
  
  tr:hover {
    background-color: #f1f8ff;
  }
  
  @media (max-width: 768px) {
    .controls {
      flex-direction: column;
      align-items: stretch;
    }
    
    .button-group {
      margin-left: 0;
      margin-top: 1rem;
    }
  }
</style>

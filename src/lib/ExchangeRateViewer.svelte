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
    try {
      // Handle both yyyy-MM-dd and dd/MM/yyyy formats
      let date;
      if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/');
        date = new Date(`${year}-${month}-${day}`);
      } else {
        date = new Date(dateStr);
      }
      return format(date, 'dd/MM/yyyy');
    } catch (e) {
      return dateStr; // Return as is if parsing fails
    }
  };

  // Handle form submission
  const handleFetch = async () => {
    if (!startDate || !endDate) {
      error = 'Please select both start and end dates';
      return;
    }
    
    error = '';
    isLoading = true;
    results = [];
    showTable = false;
    
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start > end) {
        error = 'Start date cannot be after end date';
        return;
      }
      
      // Call our server endpoint
      const response = await fetch('/api/exchange-rates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
          bank: selectedBank
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch exchange rates');
      }
      
      const data = await response.json();
      results = data.data || [];
      showTable = true;
    } catch (err) {
      error = `An error occurred while fetching exchange rates: ${err.message}`;
      console.error(err);
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
  @import './ExchangeRateViewer.css';
</style>

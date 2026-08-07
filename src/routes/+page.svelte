<script>
  import { onMount } from 'svelte';
  import { format, subDays } from 'date-fns';
  import ExchangeRateViewer from '$lib/ExchangeRateViewer.svelte';
  
  let defaultStartDate = '';
  let defaultEndDate = '';
  
  onMount(() => {
    const today = new Date();
    const weekAgo = subDays(today, 7);
    
    defaultStartDate = format(weekAgo, 'yyyy-MM-dd');
    defaultEndDate = format(today, 'yyyy-MM-dd');
  });
</script>

<main>
  {#if defaultStartDate && defaultEndDate}
    <ExchangeRateViewer 
      defaultStartDate={defaultStartDate} 
      defaultEndDate={defaultEndDate} 
    />
  {/if}
</main>

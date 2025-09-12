import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const CACHE_DIR = path.join(process.cwd(), '.price-cache');
const CACHE_FILE = path.join(CACHE_DIR, 'prices.json');

async function fetchHistoricalGBPRates() {
  try {
    // Get dates for the last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    // Format dates for BoE API (DD/MM/YYYY)
    const formatDate = (date: Date) => {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    // Fetch data from Bank of England's interactive database
    const response = await axios.get(
      'https://www.bankofengland.co.uk/boeapps/iadb/fromshowcolumns.asp',
      {
        params: {
          // This is the series code for GBP/USD
          SeriesCodes: 'XUDLGBD',
          CSV: 'T',
          Datefrom: formatDate(startDate),
          Dateto: formatDate(endDate),
        },
        responseType: 'text',
      }
    );

    // Parse the CSV response
    const records = parse(response.data, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    // Process the rates (BoE provides GBP/USD, we want USD/GBP)
    const rates = new Map<string, number>();
    for (const record of records) {
      if (record['XUDLGBD'] && record['XUDLGBD'] !== 'NaN') {
        const date = record['DATE'];
        const gbpUsdRate = parseFloat(record['XUDLGBD']);
        const usdGbpRate = 1 / gbpUsdRate;
        rates.set(date, parseFloat(usdGbpRate.toFixed(6)));
      }
    }

    console.log(`Fetched ${rates.size} days of GBP exchange rates from Bank of England`);
    return rates;
  } catch (error) {
    console.error('Error fetching GBP rates from Bank of England:', error);
    throw error;
  }
}

async function updateCacheWithRealRates() {
  try {
    console.log('Fetching real GBP rates from Bank of England...');
    const gbpRates = await fetchHistoricalGBPRates();
    
    // Read existing cache
    let cache: any[] = [];
    if (fs.existsSync(CACHE_FILE)) {
      cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    }
    
    // Update cache with real rates
    const updatedCache = cache.map(entry => {
      const rate = gbpRates.get(entry.date);
      return {
        ...entry,
        GBP: rate !== undefined ? rate : entry.GBP // Keep existing rate if no data for this date
      };
    });
    
    // Write back to cache
    fs.writeFileSync(CACHE_FILE, JSON.stringify(updatedCache, null, 2));
    
    console.log('Updated cache with real GBP rates. First few entries:');
    console.log(updatedCache.slice(0, 3).map(entry => 
      `${entry.date}: 1 USD = ${entry.GBP} GBP`
    ).join('\n'));
    
  } catch (error) {
    console.error('Failed to update cache with real rates:', error);
    process.exit(1);
  }
}

// Run the script
updateCacheWithRealRates();

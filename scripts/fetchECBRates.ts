import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { parseString } from 'xml2js';

const CACHE_DIR = path.join(process.cwd(), '.price-cache');
const CACHE_FILE = path.join(CACHE_DIR, 'prices.json');

async function fetchHistoricalGBPRates() {
  try {
    // Get dates for the last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    // Format dates for ECB API (YYYY-MM-DD)
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    
    // Fetch USD/EUR rate
    const usdEurResponse = await axios.get(
      `https://api.exchangerate.host/timeseries`,
      {
        params: {
          base: 'USD',
          symbols: 'EUR',
          start_date: formatDate(startDate),
          end_date: formatDate(endDate),
        },
      }
    );

    // Fetch EUR/GBP rate from ECB
    const ecbResponse = await axios.get(
      'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist-90d.xml',
      { responseType: 'text' }
    );

    // Parse XML response
    const ecbRates = new Map<string, number>();
    parseString(ecbResponse.data, (err, result) => {
      if (err) throw err;
      
      const cubes = result['gesmes:Envelope'].Cube[0].Cube;
      for (const cube of cubes) {
        const date = cube.$.time;
        for (const rate of cube.Cube) {
          if (rate.$.currency === 'GBP') {
            ecbRates.set(date, parseFloat(rate.$.rate));
            break;
          }
        }
      }
    });

    // Calculate USD/GBP using USD/EUR * EUR/GBP
    const usdGbpRates = new Map<string, number>();
    const usdEurRates = usdEurResponse.data.rates || {};
    
    for (const [date, rates] of Object.entries(usdEurRates)) {
      const usdEur = (rates as any).EUR;
      const eurGbp = ecbRates.get(date);
      
      if (usdEur && eurGbp) {
        const usdGbp = usdEur * eurGbp;
        usdGbpRates.set(date, parseFloat(usdGbp.toFixed(6)));
      }
    }

    console.log(`Fetched ${usdGbpRates.size} days of GBP exchange rates`);
    return usdGbpRates;
  } catch (error) {
    console.error('Error fetching GBP rates:', error);
    throw error;
  }
}

async function updateCacheWithRealRates() {
  try {
    console.log('Fetching real GBP rates...');
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
        GBP: rate !== undefined ? rate : entry.GBP // Keep existing rate if no data
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

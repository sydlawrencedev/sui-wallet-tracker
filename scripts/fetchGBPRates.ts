import axios from 'axios';
import fs from 'fs';
import path from 'path';

const CACHE_FILE = path.join(process.cwd(), '.price-cache', 'prices.json');

async function fetchGBPRates() {
  try {
    // Fetch latest GBP rates from a reliable source (using exchangerate-api.com as an example)
    const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD');
    const gbpRate = response.data.rates.GBP;
    
    // Read existing cache
    let cache: any[] = [];
    if (fs.existsSync(CACHE_FILE)) {
      cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    }
    
    // Update GBP rates in cache
    const updatedCache = cache.map(entry => ({
      ...entry,
      GBP: gbpRate // Update with latest rate
    }));
    
    // Write back to cache
    fs.writeFileSync(CACHE_FILE, JSON.stringify(updatedCache, null, 2));
    
    console.log(`Updated GBP rates in cache to: 1 USD = ${gbpRate} GBP`);
    console.log('First few entries:', updatedCache.slice(0, 3));
    
  } catch (error) {
    console.error('Error fetching GBP rates:', error);
    process.exit(1);
  }
}

fetchGBPRates();

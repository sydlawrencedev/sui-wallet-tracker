import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), '.price-cache');
const CACHE_FILE = path.join(CACHE_DIR, 'prices.json');

interface PriceData {
  date: string;  // YYYY-MM-DD
  USDC: number;   // USDC price (1 USDC = 1 USD)
  SUI: number;    // SUI price in USD
  GBP: number;    // GBP price (1 USD = X GBP)
}

// Ensure cache directory exists
function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

// Read cache file
function readCache(): PriceData[] {
  try {
    ensureCacheDir();
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading cache file:', error);
  }
  return [];
}

// Write to cache file
function writeCache(data: PriceData[]) {
  try {
    ensureCacheDir();
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing to cache file:', error);
  }
}

// Get cached price for a specific date
function getCachedPrice(date: string): PriceData | undefined {
  const cache = readCache();
  return cache.find(item => item.date === date);
}

// Update cache with new price data
async function updateCache(newData: PriceData) {
  const cache = readCache();
  const existingIndex = cache.findIndex(item => item.date === newData.date);
  
  if (existingIndex >= 0) {
    // Update existing entry
    cache[existingIndex] = newData;
  } else {
    // Add new entry
    cache.push(newData);
  }
  
  // Sort by date (newest first)
  cache.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  writeCache(cache);
  return cache;
}

// Get all cached prices
function getAllCachedPrices(): PriceData[] {
  return readCache();
}

export { 
  type PriceData,
  getCachedPrice,
  updateCache,
  getAllCachedPrices
};

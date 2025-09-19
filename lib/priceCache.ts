import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), '.price-cache');
const CACHE_FILE = path.join(CACHE_DIR, 'prices.json');

interface PriceData {
  date: string;  // YYYY-MM-DD
  USDC: number;   // USDC price (1 USDC = 1 USD)
  SUI: number;    // SUI price in USD
  GBP: number;    // GBP price (1 USD = X GBP)
  DEEP?: number;  // DEEP token price in USD
  FUNDS: number;  // Available funds in USD
  TOKENS_AVAILABLE: number;  // Number of tokens available
  timestamp?: number; // Unix timestamp in milliseconds
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
  
  // Add or update timestamp
  newData.timestamp = Date.now();
  
  try {
    // Get the latest wallet data to update FUNDS
    const { getServerSideWalletData } = await import('./walletData');
    const walletAddress = process.env.NEXT_PUBLIC_DEFAULT_SUI_ADDRESS;
    
    if (walletAddress) {
      const { totalValue } = await getServerSideWalletData(walletAddress);
      newData.FUNDS = totalValue;
    } else {
      console.warn('NEXT_PUBLIC_DEFAULT_SUI_ADDRESS is not set in environment variables');
    }
  } catch (error) {
    console.error('Error updating wallet funds in cache:', error);
    // If there's an error, keep the existing FUNDS value or default to 0
    if (existingIndex >= 0) {
      newData.FUNDS = cache[existingIndex]?.FUNDS || 0;
    } else {
      newData.FUNDS = 0;
    }
  }
  
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

// Create a function to generate default price data
function getDefaultPriceData(overrides: Partial<PriceData> = {}): PriceData {
  const now = new Date();
  const defaultData: PriceData = {
    date: now.toISOString().split('T')[0], // YYYY-MM-DD format
    USDC: 1,            // 1 USDC = 1 USD
    SUI: 0,             // Will be updated with real data
    GBP: 0.78,          // Example GBP rate (1 USD = 0.78 GBP)
    FUNDS: 0,           // Will be updated with real data
    TOKENS_AVAILABLE: 998942, // Will be updated with real data
    timestamp: Date.now(), // Current timestamp
    ...overrides         // Allow overriding any default values
  };

  return defaultData;
}

export { 
  type PriceData,
  getCachedPrice,
  updateCache,
  getAllCachedPrices,
  getDefaultPriceData
};

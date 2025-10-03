import { NextResponse } from 'next/server';
import { getCachedPrice, updateCache, getDefaultPriceData, type PriceData } from '@/lib/priceCache';

// Default prices to use when no cache is available
const DEFAULT_PRICES: Record<string, number> = {
  SUI: 3.6203,
  USDC: 1.0,
  DEEP: 0.1365,
  AT1000i: 0
};

// Dynamic imports for Node.js modules
let fs: any;
let path: any;

async function initModules() {
  if (!fs || !path) {
    fs = await import('fs/promises');
    path = await import('path');
  }
}

// Initialize modules when the module loads
const modulesInitialized = initModules();

async function getPriceDataPath() {
  await modulesInitialized;
  return path.default.join(process.cwd(), '../sui-data/live-data-latest.csv');
}

// Helper to get today's date in YYYY-MM-DD format
function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

// In-memory cache with a longer duration to reduce API calls
interface PriceCacheItem {
  price: number;
  timestamp: number;
  lastFetched: number;
  lastLogTime: number;
  isFetching: boolean; // Track if a fetch is in progress
  pendingCallbacks: Array<(price: number) => void>; // Queue for concurrent requests
}

const priceCache: Record<string, PriceCacheItem> = {};

// Cache duration settings (in milliseconds)
const CACHE_DURATION_MS = 30 * 1000; // 5 minutes - how long to use the cached price
const STALE_WHILE_REVALIDATE_MS = 10 * 60 * 1000; // 10 minutes - serve stale while revalidating
const MIN_FETCH_INTERVAL_MS = 30 * 1000; // 30 seconds - minimum time between API calls
const LOG_INTERVAL_MS = 5 * 1000; // Only log every 5 seconds max per token

// Helper function to fetch fresh price from local CSV file
async function fetchFreshPrice(token: string): Promise<number> {
  const now = Date.now();
  const tokenUpper = token.toUpperCase();

  // Initialize cache entry if it doesn't exist
  if (!priceCache[tokenUpper]) {
    priceCache[tokenUpper] = {
      price: 0,
      timestamp: 0,
      lastFetched: 0,
      lastLogTime: 0,
      isFetching: false,
      pendingCallbacks: []
    };
  }

  const cacheEntry = priceCache[tokenUpper];

  // If already fetching, queue this request
  if (cacheEntry.isFetching) {
    return new Promise<number>((resolve) => {
      cacheEntry.pendingCallbacks.push(resolve);
    });
  }

  // Mark as fetching
  cacheEntry.isFetching = true;
  cacheEntry.lastFetched = now;

  // Only log if we haven't logged for this token in a while
  if (!priceCache[tokenUpper].lastLogTime || now - priceCache[tokenUpper].lastLogTime > LOG_INTERVAL_MS) {
    console.log(`[${new Date(now).toISOString()}] Fetching fresh price for ${tokenUpper}`);
    priceCache[tokenUpper].lastLogTime = now;
  }

  // For USDC, return 1 directly
  if (tokenUpper === 'USDC') {
    return 1;
  }

  let price = 0;
  try {
    // Read the CSV file
    const priceDataPath = await getPriceDataPath();
    const fileContent = await fs.readFile(priceDataPath, 'utf-8');
    const lines = fileContent.trim().split('\n');

    if (lines.length < 2) {
      throw new Error('CSV file is empty or has no data rows');
    }

    // The last line contains the most recent data
    const lastLine = lines[lines.length - 1];
    const firstComma = lastLine.indexOf(',');
    if (firstComma === -1) {
      throw new Error('Invalid CSV format: No comma found in data line');
    }

    let jsonStr = lastLine.substring(firstComma + 1).trim();

    try {
      // Remove surrounding quotes if they exist
      if (jsonStr.startsWith('"') && jsonStr.endsWith('"')) {
        jsonStr = jsonStr.slice(1, -1);
      }

      // Handle the escaped quotes in the JSON
      let fixedJson = jsonStr.replace(/"""/g, '"'); // Replace """ with "
      fixedJson = fixedJson.replace(/""/g, '"');     // Replace "" with "

      // Parse the JSON data
      const data = JSON.parse(fixedJson);

      if (!Array.isArray(data)) {
        throw new Error('Expected array of coin data in CSV');
      }

      // Find the token data
      const tokenData = data.find((item: any) => item?.coin === tokenUpper);

      if (!tokenData) {
        const availableCoins = data.map((item: any) => item?.coin).filter(Boolean);
        console.error(`Token ${tokenUpper} not found in CSV data. Available tokens:`, availableCoins);
        throw new Error(`Token not found in price data: ${tokenUpper}`);
      }

      if (tokenData.close === undefined || tokenData.close === null) {
        throw new Error(`Invalid price data for ${tokenUpper}: missing 'close' price`);
      }

      price = parseFloat(tokenData.close);
      if (isNaN(price)) {
        console.error(`Invalid price value for ${tokenUpper}:`, tokenData.close);
        throw new Error(`Invalid price value for ${tokenUpper}`);
      }

      try {
        // Only update the file cache if we have a valid price
        if (price > 0) {
          const today = getTodayDateString();
          const cachedData = getCachedPrice(today) || getDefaultPriceData({ date: today });

          // Only update if the price has changed significantly (more than 0.1%)
          if (Math.abs((cachedData[tokenUpper as keyof PriceData] as number || 0) - price) / price > 0.001) {
            const updatedData: PriceData = {
              ...cachedData,
              [tokenUpper]: price,
              date: today,
              timestamp: now
            };

            // Don't await this to avoid blocking the response
            updateCache(updatedData).catch(error => {
              console.error('Background cache update failed:', error);
            });
          }
        }
      } catch (error) {
        console.error('Error in background cache update:', error);
      }

      return price;
    } catch (parseError) {
      console.error('Failed to parse price data from CSV:', parseError);
      console.error('Problematic JSON string:', jsonStr);
      throw new Error('Invalid JSON data in CSV file');
    }
  } catch (error) {
    console.error(`Error fetching price for ${tokenUpper}:`, error);
    throw error;
  } finally {
    // Process any queued callbacks and clear the fetching state
    if (priceCache[tokenUpper]) {
      const cacheEntry = priceCache[tokenUpper];
      const callbacks = [...cacheEntry.pendingCallbacks];
      cacheEntry.pendingCallbacks = [];
      cacheEntry.isFetching = false;

      // Resolve all queued callbacks with the final price
      callbacks.forEach(cb => cb(price));
    }
  }
}

// Export the GET function as a named export
async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const useCache = searchParams.get('useCache') !== 'false';

  // Handle case when no token is provided - return all default tokens
  if (!token) {
    const defaultTokens = ['DEEP', 'SUI', 'USDC', 'AT1000i'];
    const prices: Record<string, number> = {};

    for (const t of defaultTokens) {
      if (t === 'AT1000i') {
        prices[t] = 0;
        continue;
      }

      const tokenUpper = t.toUpperCase();
      const cachedItem = priceCache[tokenUpper];

      if (cachedItem) {
        prices[tokenUpper] = cachedItem.price;
      } else {
        // If not in cache, use default price or 0
        prices[tokenUpper] = DEFAULT_PRICES[tokenUpper] || 0;
      }
    }

    return NextResponse.json(prices);
  }

  // Handle single token request
  if (token === "AT1000i") {
    return NextResponse.json({ price: 0 }, { status: 200 });
  }

  const tokenUpper = token.toUpperCase();
  const now = Date.now();

  // Check in-memory cache first (faster and reduces file I/O)
  const cachedItem = priceCache[tokenUpper];

  if (cachedItem) {
    const cacheAge = now - cachedItem.timestamp;
    const timeSinceLastFetch = now - cachedItem.lastFetched;
    const isStale = cacheAge > CACHE_DURATION_MS;
    const isTooStale = cacheAge > STALE_WHILE_REVALIDATE_MS;

    // If we have a fresh cache, return it immediately
    if (!isStale) {
      if (!cachedItem.lastLogTime || now - cachedItem.lastLogTime > LOG_INTERVAL_MS) {
        console.log(`[${new Date(now).toISOString()}] Using cached ${tokenUpper} price: $${cachedItem.price} (${Math.round(cacheAge / 1000)}s old)`);
        cachedItem.lastLogTime = now;
      }

      return NextResponse.json({
        price: cachedItem.price,
        timestamp: cachedItem.timestamp,
        isCached: true
      });
    }

    // If the cache is stale but not too old, serve stale while revalidating
    if (!isTooStale && timeSinceLastFetch >= MIN_FETCH_INTERVAL_MS) {
      if (!cachedItem.lastLogTime || now - cachedItem.lastLogTime > LOG_INTERVAL_MS) {
        console.log(`[${new Date(now).toISOString()}] Returning stale ${tokenUpper} price (refreshing in background)`);
        cachedItem.lastLogTime = now;
      }

      // Always trigger the refresh, but let the fetchFreshPrice handle queuing
      fetchFreshPrice(tokenUpper)
        .then(price => {
          if (priceCache[tokenUpper]) {
            priceCache[tokenUpper] = {
              ...priceCache[tokenUpper],
              price,
              timestamp: Date.now(),
              lastFetched: Date.now(),
              lastLogTime: 0,
              isFetching: false
            };
          }
        })
        .catch(error => {
          console.error(`Failed to refresh ${tokenUpper} price:`, error.message);
          // Keep the old price but update the lastFetched to avoid repeated failed fetches
          if (priceCache[tokenUpper]) {
            priceCache[tokenUpper].lastFetched = Date.now();
            priceCache[tokenUpper].isFetching = false;
          }
        });

      return NextResponse.json({
        price: cachedItem.price,
        timestamp: cachedItem.timestamp,
        isCached: true,
        isStale: true
      });
    }
  }

  // If we get here, we need to fetch a fresh price
  try {
    const price = await fetchFreshPrice(tokenUpper);

    // Update in-memory cache with new price
    priceCache[tokenUpper] = {
      price,
      timestamp: now,
      lastFetched: now,
      lastLogTime: now,
      isFetching: false,
      pendingCallbacks: []
    };

    console.log(`[${new Date(now).toISOString()}] Fetched fresh ${tokenUpper} price: $${price}`);
    return NextResponse.json({
      price,
      timestamp: now,
      isCached: false
    });
  } catch (error) {
    console.error('Error fetching fresh price:', error);

    // If we have any cached data, return it even if stale
    if (cachedItem) {
      console.log(`API failed, returning stale cache for ${tokenUpper}: $${cachedItem.price}`);
      return NextResponse.json({
        price: cachedItem.price,
        timestamp: cachedItem.timestamp,
        isCached: true,
        isStale: true,
        error: 'Using cached data due to error: ' + (error instanceof Error ? error.message : String(error))
      });
    }

    // No cache available, return error
    console.error('No cached data available and fetch failed');
    return NextResponse.json(
      {
        error: 'Failed to fetch price and no cached data available',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 503 }
    );
  }
}

// Export the GET function and set dynamic configuration
export { GET };
export const dynamic = 'force-dynamic';
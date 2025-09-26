import { NextResponse } from 'next/server';
import { getCachedPrice, updateCache, getDefaultPriceData, type PriceData } from '@/lib/priceCache';

const DEEPBOOK_INDEXER_URL = 'https://deepbook-indexer.mainnet.mystenlabs.com/summary';

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

// Helper function to fetch fresh price from DeepBook Indexer
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

  const response = await fetch(DEEPBOOK_INDEXER_URL);
  const responseData = await response.text();

  if (!response.ok) {
    console.error(`DeepBook Indexer API Error (${response.status}):`, responseData);
    throw new Error(`DeepBook Indexer API failed with status: ${response.status}`);
  }

  let data;
  try {
    data = JSON.parse(responseData);
  } catch (parseError) {
    console.error('Failed to parse DeepBook Indexer response:', responseData);
    throw new Error('Invalid JSON response from DeepBook Indexer');
  }

  // For USDC, return 1 directly
  if (token.toUpperCase() === 'USDC') {
    return 1;
  }

  // Determine the trading pair to look for
  const tradingPair = token.toUpperCase() === 'SUI' ? 'SUI_USDC' : 'DEEP_USDC';

  // The response is an array of pairs, find the one we're interested in
  if (!Array.isArray(data)) {
    console.error('Expected array response from DeepBook Indexer, got:', typeof data);
    throw new Error('Invalid response format from DeepBook Indexer');
  }

  const pairData = data.find((pair: any) => pair.trading_pairs === tradingPair);

  if (!pairData) {
    const availablePairs = data.map((p: any) => p.trading_pairs).filter(Boolean);
    console.error(`Trading pair ${tradingPair} not found in response. Available pairs:`, availablePairs);
    throw new Error(`Trading pair not found: ${tradingPair}`);
  }

  if (pairData.last_price === undefined || pairData.last_price === null) {
    console.error(`No last_price found for ${tradingPair} in:`, pairData);
    throw new Error(`No price available for ${tradingPair}`);
  }

  const price = parseFloat(pairData.last_price);
  if (isNaN(price)) {
    console.error(`Invalid price value for ${tradingPair}:`, pairData.last_price);
    throw new Error(`Invalid price value for ${tradingPair}`);
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

  return price;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const useCache = searchParams.get('useCache') !== 'false';

  if (token === "AT1000i") {
    return NextResponse.json({ price: 0 }, { status: 200 });
  }

  if (!token) {
    return NextResponse.json({ error: 'Token symbol is required' }, { status: 400 });
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

    // If the cache is too stale, we'll fall through to a fresh fetch
  }

  const upperToken = token.toUpperCase();
  if (!['SUI', 'USDC', 'DEEP'].includes(upperToken)) {
    return NextResponse.json({ error: `Token not supported: ${token}` }, { status: 400 });
  }

  try {
    // Fetch fresh price
    const price = await fetchFreshPrice(upperToken);

    // Update in-memory cache with new price
    priceCache[upperToken] = {
      price,
      timestamp: now,
      lastFetched: now,
      lastLogTime: now,
      isFetching: false,
      pendingCallbacks: []
    };

    console.log(`[${new Date(now).toISOString()}] Fetched fresh ${upperToken} price: $${price}`);
    return NextResponse.json({
      price,
      timestamp: now,
      isCached: false
    });
  } catch (error) {
    console.error('Error fetching fresh price:', error);

    // If we have any cached data, return it even if stale
    if (cachedItem) {
      console.log(`API failed, returning stale cache for ${upperToken}: $${cachedItem.price}`);
      return NextResponse.json({
        price: cachedItem.price,
        timestamp: cachedItem.timestamp,
        isCached: true,
        isStale: true,
        error: 'Using cached data due to API error: ' + (error instanceof Error ? error.message : String(error))
      });
    }

    // No cache available, return error
    console.error('No cached data available and API failed');
    return NextResponse.json(
      {
        error: 'Failed to fetch price and no cached data available',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 503 }
    );
  }
}

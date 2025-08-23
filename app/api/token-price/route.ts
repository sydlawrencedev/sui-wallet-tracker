import { NextResponse } from 'next/server';

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/simple/price';

// In-memory cache
const priceCache: {
  [tokenId: string]: {
    price: number;
    timestamp: number;
  };
} = {};

const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// Helper function to fetch fresh price from CoinGecko
async function fetchFreshPrice(tokenId: string) {
  console.log(`Fetching fresh price for ${tokenId}`);
  const response = await fetch(`${COINGECKO_API_URL}?ids=${tokenId}&vs_currencies=usd`);
  const responseData = await response.text();
  
  if (!response.ok) {
    console.error(`CoinGecko API Error (${response.status}):`, responseData);
    throw new Error(`CoinGecko API failed with status: ${response.status}`);
  }
  
  let data;
  try {
    data = JSON.parse(responseData);
  } catch (parseError) {
    console.error('Failed to parse CoinGecko response:', responseData);
    throw new Error('Invalid JSON response from CoinGecko');
  }
  
  const price = data[tokenId]?.usd;
  if (price === undefined) {
    console.error('Price not found in response:', data);
    throw new Error(`Price not found for token: ${tokenId}`);
  }

  return price;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token symbol is required' }, { status: 400 });
  }

  const tokenToId: { [key: string]: string } = {
    SUI: 'sui',
    USDC: 'usd-coin',
    DEEP: 'deep',
  };

  const tokenId = tokenToId[token.toUpperCase()];

  if (!tokenId) {
    return NextResponse.json({ error: `Token not supported: ${token}` }, { status: 400 });
  }

  const now = Date.now();
  const cachedData = priceCache[tokenId];
  const isCacheValid = cachedData && (now - cachedData.timestamp) < CACHE_DURATION_MS;

  try {
    // If cache is invalid or doesn't exist, fetch fresh price
    if (!isCacheValid) {
      const price = await fetchFreshPrice(tokenId);
      priceCache[tokenId] = {
        price,
        timestamp: now
      };
      console.log(`Successfully fetched fresh price for ${token}: $${price}`);
      return NextResponse.json({ price, timestamp: now });
    }
    
    // If we have valid cache, return it
    console.log(`Returning cached price for ${token}: $${cachedData.price} (${Math.round((now - cachedData.timestamp) / 1000)}s old)`);
    return NextResponse.json({ 
      price: cachedData.price, 
      timestamp: cachedData.timestamp,
      isCached: true 
    });
  } catch (error) {
    console.error('Error fetching fresh price:', error);
    
    // If we have any cached data, return it even if stale
    if (cachedData) {
      console.log(`API failed, returning stale cache for ${token}: $${cachedData.price}`);
      return NextResponse.json({ 
        price: cachedData.price, 
        timestamp: cachedData.timestamp,
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

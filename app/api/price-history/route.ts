import { NextResponse } from 'next/server';
import { getCachedPrice, updateCache, getAllCachedPrices, PriceData } from '@/lib/priceCache';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const SUI_COIN_ID = 'sui';
const DAYS = 30;

interface CoinGeckoMarketChartResponse {
  prices: [number, number][];
}

interface ExchangeRatesResponse {
  rates: {
    USD: number;
    GBP: number;
  };
}

async function fetchSUIPrice(date: string): Promise<number> {
  const response = await fetch(
    `${COINGECKO_API}/coins/${SUI_COIN_ID}/history?date=${date}&localization=false`,
    { next: { revalidate: 3600 } }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch SUI price for ${date}`);
  }
  
  const data = await response.json();
  return data.market_data?.current_price?.usd || 0;
}

async function fetchExchangeRates(): Promise<{ usdToGbp: number }> {
  const response = await fetch(
    'https://api.exchangerate-api.com/v4/latest/USD',
    { next: { revalidate: 3600 } }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch exchange rates');
  }
  
  const data: ExchangeRatesResponse = await response.json();
  return { usdToGbp: data.rates.GBP };
}

export async function GET() {
  try {
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    
    // Try to get cached data first
    const cachedData = getAllCachedPrices();
    
    // If we have recent cached data (from today), return it
    const todayData = cachedData.find(item => item.date === dateString);
    if (todayData) {
      return NextResponse.json({ data: cachedData });
    }
    
    // Fetch fresh data
    const [suiPrice, { usdToGbp }] = await Promise.all([
      fetchSUIPrice(dateString),
      fetchExchangeRates()
    ]);
    
    // Create new price data
    const newPriceData: PriceData = {
      date: dateString,
      USDC: 1, // 1 USDC = 1 USD
      SUI: suiPrice,
      GBP: usdToGbp
    };
    
    // Update cache
    await updateCache(newPriceData);
    
    // Return all cached data (including the newly added)
    const updatedCache = getAllCachedPrices();
    return NextResponse.json({ data: updatedCache });
    
  } catch (error) {
    console.error('Error in price history API:', error);
    
    // If there's an error but we have cached data, return that
    const cachedData = getAllCachedPrices();
    if (cachedData.length > 0) {
      return NextResponse.json({ 
        data: cachedData,
        error: 'Using cached data due to API error' 
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch price history' },
      { status: 500 }
    );
  }
}

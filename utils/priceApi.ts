import { apiFetch } from './api';

interface PriceData {
  date: string;
  USDC: number;
  SUI: number;
  GBP: number;
  DEEP?: number;
  FUNDS: number;
  TOKENS_AVAILABLE: number;
  timestamp?: number;
}

// In-memory cache for prices by date
const priceCache = new Map<string, number | null>();
let allPricesCache: Array<{ date: string, DEEP?: number }> | null = null;

/**
 * Fetches all historical price data and caches it
 */
export async function getDeepPriceForAllDates(): Promise<void> {
  try {
    console.log("Fetching price history...");
    const data = await apiFetch<{ data: PriceData[] }>('/api/price-history');
    console.log("Price history data received");

    allPricesCache = data.data;
    // Populate the price cache with all the data
    data.data.forEach((priceData: PriceData) => {
      if (priceData.DEEP !== undefined) {
        priceCache.set(priceData.date, priceData.DEEP);
      }
    });
  } catch (error) {
    console.error('Error fetching all price history:', error);
    throw error;
  }
}

getDeepPriceForAllDates();

/**
 * Get the DEEP token price in USD for a specific date (synchronous, cache-only)
 * @param date Date string in YYYY-MM-DD format or Date object
 * @returns DEEP token price in USD, or null if not found in cache
 */
export function getDeepPriceForDate(date: Date | string): number | null {
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];

  // Check if we have this exact date in cache
  if (priceCache.has(dateStr)) {
    return priceCache.get(dateStr) ?? null;
  }

  // If we have all prices cached, try to find the closest date
  if (allPricesCache) {
    const sortedData = [...allPricesCache]
      .filter(p => p.date <= dateStr)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const closestPrice = sortedData[0]?.DEEP ?? null;
    if (closestPrice !== null) {
      priceCache.set(dateStr, closestPrice);
      return closestPrice;
    }
  }

  // If we get here, the price isn't in the cache
  console.warn(`Price not found for deep in cache for date: ${dateStr}, trying the next day`);
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  return null;
}

/**
 * Format a token amount with USD value
 * @param amount Token amount as a string
 * @param decimals Number of decimal places
 * @param priceInUsd Price of 1 token in USD
 * @returns Formatted string with token amount and USD value
 */
export function formatTokenWithUsd(amount: string, decimals: number, priceInUsd: number | null): string {
  const numericAmount = parseFloat(amount) / Math.pow(10, decimals);
  const formattedAmount = numericAmount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  });

  if (priceInUsd && priceInUsd > 0) {
    const usdValue = numericAmount * priceInUsd;
    const formattedUsd = usdValue.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD'
    });
    return `${formattedAmount} (${formattedUsd})`;
  }

  return `${formattedAmount}`;
}

import { PriceData, getCachedPrice, getAllCachedPrices } from '@/lib/priceCache';

/**
 * Get the DEEP token price in USD for a specific date
 * @param date Date string in YYYY-MM-DD format or Date object
 * @returns DEEP token price in USD, or null if not found
 */
export function getDeepPriceForDate(date: Date | string): number | null {
  try {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    const cachedData = getCachedPrice(dateStr);
    
    if (cachedData && typeof cachedData.DEEP === 'number') {
      return cachedData.DEEP;
    }
    
    // If no cached data for the exact date, try to find the closest previous date
    const allPrices = getAllCachedPrices();
    const pricesBeforeDate = allPrices
      .filter(p => p.date <= dateStr)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
    const closestMatch = pricesBeforeDate.find(p => typeof p.DEEP === 'number' && p.DEEP > 0);
    
    return closestMatch?.DEEP ?? null;
  } catch (error) {
    console.error('Error getting DEEP price for date:', date, error);
    return null;
  }
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
    maximumFractionDigits: 6
  });
  
  if (priceInUsd && priceInUsd > 0) {
    const usdValue = numericAmount * priceInUsd;
    const formattedUsd = usdValue.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD'
    });
    return `${formattedAmount} DEEP (${formattedUsd})`;
  }
  
  return `${formattedAmount} DEEP`;
}

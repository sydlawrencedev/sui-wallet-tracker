import { TokenBalance } from '../services/suiExplorer';


// Cache with 30 second TTL
const walletDataCache: {
  [key: string]: { data: any; timestamp: number };
} = {};
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

export async function getWalletData(address: string) {
  const now = Date.now();
  const cacheKey = `wallet-${address}`;
  
  // Return cached data if it exists and is not expired
  if (walletDataCache[cacheKey] && now - walletDataCache[cacheKey].timestamp < CACHE_TTL_MS) {
    return walletDataCache[cacheKey].data;
  }

  try {
    const response = await fetch(`/api/wallet/${address}`, {
      next: { revalidate: 30 } // Next.js specific: revalidate after 30 seconds
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch wallet data');
    }
    
    const data = await response.json();
    
    // Update cache
    walletDataCache[cacheKey] = {
      data,
      timestamp: now
    };
    
    return data;
  } catch (error) {
    console.error('Error fetching wallet data:', error);
    
    // Return stale data if available, otherwise throw
    if (walletDataCache[cacheKey]?.data) {
      console.warn('Using stale wallet data due to fetch error');
      return walletDataCache[cacheKey].data;
    }
    
    throw error;
  }
}

export async function getServerSideWalletData(address: string) {
  const { fetchWalletBalances } = await import('../services/suiExplorer');

  try {

    const balances = await fetchWalletBalances(address);

    if (balances.length === 0) {
      return { tokens: [], totalValue: 0, totalGBPValue: 0, error: 'No token balances found for this wallet' };
    }

    const totalValue = balances.reduce((sum, token) => sum + token.valueUSD, 0);
    const totalGBPValue = balances.reduce((sum, token) => sum + token.valueGBP, 0);

    return { tokens: balances, totalValue, totalGBPValue, error: null };
  } catch (err) {
    console.error('Error in getServerSideWalletData:', err);
    return { tokens: [], totalValue: 0, totalGBPValue: 0, error: 'Failed to load wallet data' };
  }
}

export function formatBalance(balance: string, decimals: number): string {
  const value = BigInt(balance);
  const divisor = BigInt(10 ** decimals);
  const whole = value / divisor;
  const fractional = (value % divisor).toString().padStart(decimals, '0').replace(/0+$/, '');
  return fractional ? `${whole}.${fractional}` : whole.toString();
}

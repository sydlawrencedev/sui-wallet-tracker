import { TokenBalance } from '../services/suiExplorer';

export async function getWalletData(address: string) {
  try {
    const response = await fetch(`/api/wallet/${address}`);
    if (!response.ok) {
      throw new Error('Failed to fetch wallet data');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching wallet data:', error);
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

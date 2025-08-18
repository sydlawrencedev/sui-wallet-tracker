'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchWalletBalances, TokenBalance } from '../services/suiExplorer';

interface WalletInfoProps {
  address: string;
}

const formatBalance = (balance: string, decimals: number): string => {
  const value = BigInt(balance);
  const divisor = BigInt(10 ** decimals);
  const whole = value / divisor;
  const fractional = (value % divisor).toString().padStart(decimals, '0').replace(/0+$/, '');
  return fractional ? `${whole}.${fractional}` : whole.toString();
};

export function WalletInfo({ address }: WalletInfoProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [totalValue, setTotalValue] = useState<number>(0);
  const [totalGBPValue, setTotalGBPValue] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);
  const [txDigest, setTxDigest] = useState<string | null>(null);

  const loadWalletData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const balances = await fetchWalletBalances(address);
      
      if (balances.length === 0) {
        setError('No token balances found for this wallet');
        setTokens([]);
        return;
      }
      
      const totalVal = balances.reduce((sum, token) => sum + token.valueUSD, 0);
      const totalGBP = balances.reduce((sum, token) => sum + token.valueGBP, 0);
      
      setTokens(balances);
      setTotalValue(totalVal);
      setTotalGBPValue(totalGBP);
    } catch (err) {
      console.error('Error loading wallet data:', err);
      setError('Failed to load wallet data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    loadWalletData();
    const interval = setInterval(loadWalletData, 30000);
    return () => clearInterval(interval);
  }, [loadWalletData]);

  const handleSwap = async (amount: string) => {
    setIsSwapping(true);
    setTxDigest(null);
    setError(null);

    try {
      const response = await fetch('/api/swap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address, amount }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.details || 'Swap failed');
      }

      setTxDigest(result.digest);
      console.log('Swap successful, digest:', result.digest);
      setTimeout(loadWalletData, 3000); // Refresh balance after a delay
    } catch (err) {
      console.error('Swap failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(`Swap failed: ${errorMessage}`);
    } finally {
      setIsSwapping(false);
    }
  };

  const formatCurrency = (value: number, currency: string = 'GBP') => {
    if (!Number.isFinite(value)) return 'N/A';
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(value);
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      {error && <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50">{error}</div>}
      {txDigest && (
        <div className="p-4 mb-4 text-sm text-green-800 rounded-lg bg-green-50">
          Swap successful! <a href={`https://suiscan.xyz/mainnet/tx/${txDigest}`} target="_blank" rel="noopener noreferrer" className="font-medium underline">View on Explorer</a>
        </div>
      )}
      
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Portfolio Value</h2>
        <p className="text-2xl font-semibold text-gray-900">{formatCurrency(totalGBPValue, 'GBP')}</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-700">Tokens</h3>
        {tokens.map((token) => (
          <div key={token.coinType} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium">{token.symbol}</div>
              <div className="text-sm text-gray-500">{formatBalance(token.balance, token.decimals)}</div>
            </div>
            <div className="text-right">
              <div className="font-medium">{formatCurrency(token.valueGBP, 'GBP')}</div>
              {token.symbol === 'USDC' && parseFloat(formatBalance(token.balance, token.decimals)) > 0 && (
                <div className="mt-1">
                  <button
                    onClick={() => handleSwap(token.balance)}
                    disabled={isSwapping}
                    className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
                  >
                    {isSwapping ? 'Swapping...' : 'Swap All to SUI'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 text-sm text-gray-500 text-center">
        <button onClick={loadWalletData} className="text-blue-500 hover:underline">Refresh</button>
      </div>
    </div>
  );
}

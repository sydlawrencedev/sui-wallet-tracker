'use client';

import { useEffect, useState, useCallback } from 'react';
import { TokenBalance } from '../services/suiExplorer';
import { getWalletData, formatBalance } from '../lib/walletData';

interface WalletInfoProps {
  address: string;
  onTotalValueChange?: (value: number) => void;
}

export function WalletInfo({ address, onTotalValueChange }: WalletInfoProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [tokens, setTokens] = useState<TokenBalance[]>([]);
  const [totalValue, setTotalValue] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const loadWalletData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { tokens, totalValue, error } = await getWalletData(address);

      if (error) {
        setError(error);
        setTokens([]);
        return;
      }

      setTokens(tokens);
      setTotalValue(totalValue);

      // Notify parent component about the total value change
      if (onTotalValueChange) {
        onTotalValueChange(totalValue, tokens);
      }
    } catch (err) {
      console.error('Error loading wallet data:', err);
      setError('Failed to load wallet data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [address, onTotalValueChange]);

  useEffect(() => {
    loadWalletData();
    const interval = setInterval(loadWalletData, 30000);
    return () => clearInterval(interval);
  }, [loadWalletData]);

  const formatCurrency = (value: number, currency: string = 'GBP') => {
    if (!Number.isFinite(value)) return 'N/A';
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(value);
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <a href={`https://suiscan.xyz/mainnet/account/${address}`} target="_blank" rel="noopener noreferrer" className="font-medium underline ">View on Explorer</a>
      {error && <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50">{error}</div>}

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Portfolio Value</h2>
        <p className="text-2xl font-semibold text-gray-900">{formatCurrency(totalValue, 'USD')}</p>
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
              <div className="font-medium">{formatCurrency(token.valueUSD, 'USD')}</div>

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

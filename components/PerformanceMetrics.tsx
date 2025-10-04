'use client';

import { AnimatedNumber } from './AnimatedNumber';
import { getWalletData } from '../lib/walletData';
import { useEffect, useState, useCallback } from 'react';

interface PerformanceMetricsProps {
  portfolioValue?: number;
  suiPrice?: number;
  address: string;
  walletIn?: number;
}

export default function PerformanceMetrics({ address, portfolioValue }: PerformanceMetricsProps) {

  const [tokensInCirculation, setTokensInCirculation] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const wallet = false;

  const loadWalletData = useCallback(async () => {
    try {

      const { tokens, error } = await getWalletData(address);
      tokens.forEach(token => {
        if (token.symbol === "USDC") {
          if (token.balance / 1000000 < 10) {

          }
        }
      });


      if (error) {
        setError(error);
        return;
      }

    } catch (err) {
      console.error('Error loading wallet data:', err);
      setError('Failed to load wallet data. Please try again later.');
    }
  }, [address]);

  useEffect(() => {

    loadWalletData();

    setTokensInCirculation(tokensInCirculation);
  }, [loadWalletData, tokensInCirculation]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch backtest data
        const [pricesResponse] = await Promise.all([
          fetch('/api/price-history')
        ]);

        if (pricesResponse.ok) {
          const { data: prices } = await pricesResponse.json();
          if (prices && prices.length > 0) {
            // Get the most recent price data
            const latestData = prices[0];
            const tokensOutstanding = 1000000 - (latestData.TOKENS_AVAILABLE || 0);
            setTokensInCirculation(tokensOutstanding > 0 ? tokensOutstanding : 1);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="text-center py-4">Fetching data...</div>;
  }

  if (error) {
    return <div className="text-center py-4 text-red-500">Error: {error}</div>;
  }

  return (

    <div>
      <div className="wallet-card small-height">
        <div className="wallet-header">
          <h2>Live Net Asset Value (NAV)</h2>
        </div>
        <div className="balance-amount">
          {portfolioValue !== undefined ? (
            <AnimatedNumber
              value={portfolioValue}
              duration={300000}
              className="text-2xl font-semibold"
              decimalPlaces={8}
              showDirectionColor={true}
              currency="USD"
            />

          ) : (
            <p className="text-2xl font-semibold text-blue-400">Loading...</p>
          )}
        </div>

      </div>

      {(!wallet) && (

        <div className="wallet-card small-height">
          <div className="wallet-header">
            <h2>Shares available</h2>
          </div>
          <div className="balance-amount">
            {tokensInCirculation !== undefined ? (
              <AnimatedNumber
                value={1000000 - tokensInCirculation}
                duration={300000}
                className="text-2xl font-semibold inline-block"
                decimalPlaces={8}
                showDirectionColor={true}
                currency=""
              />
            ) : (
              <p className="text-2xl font-semibold text-blue-400">Loading...</p>
            )}
          </div>

        </div>
      )}
      {(wallet) && (

        <div className="wallet-card small-height">
          <div className="wallet-header">
            <h2>Live Share Price</h2>
          </div>
          <div className="balance-amount">
            {tokensInCirculation !== undefined && portfolioValue !== undefined ? (
              <AnimatedNumber
                value={portfolioValue / tokensInCirculation}
                duration={300000}
                className="text-2xl font-semibold inline-block"
                decimalPlaces={8}
                showDirectionColor={true}
                currency="USD"
              />
            ) : (
              <p className="text-2xl font-semibold text-blue-400">Loading...</p>
            )}
          </div>

        </div>
      )}
      <div className="wallet-card small-height">
        <div className="wallet-header">
          <h2>Total Trading Volume</h2>
        </div>
        <div className="balance-amount">$179,921</div>

      </div>

    </div>
  );
}

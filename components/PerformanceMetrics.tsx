'use client';

import { AnimatedNumber } from './AnimatedNumber';
import { getWalletData } from '../lib/walletData';
import { useEffect, useState, useCallback } from 'react';

interface PerformanceMetricsProps {
  portfolioValue?: number;
  suiPrice?: number;
  address: string;
  tokensAvailable?: number;
  walletIn?: number;
}

export default function PerformanceMetrics({ address, portfolioValue, tokensAvailable, walletIn }: PerformanceMetricsProps) {

  console.log(walletIn);

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
    // loadWalletData();

  }, [loadWalletData]);

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
              duration={30000}
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
            {tokensAvailable !== undefined ? (
              <AnimatedNumber
                value={tokensAvailable}
                duration={30000}
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
            {/* {tokensInCirculation !== undefined && portfolioValue !== undefined ? (
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
            )} */}
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

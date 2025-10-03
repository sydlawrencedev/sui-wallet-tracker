'use client';

import { AnimatedNumber } from './AnimatedNumber';
import { getWalletData, formatBalance } from '../lib/walletData';
import { FundsChart } from './FundsChart';
import { useEffect, useState, useMemo, useCallback } from 'react';

interface PriceData {
  date: string;
  TOKENS_AVAILABLE: number;
  FUNDS: number;
  [key: string]: any;
}

interface BacktestResult {
  initialBalance: number;
  finalBalance: number;
  totalReturn: number;
  hodl: number;
  trades: Array<{
    entryTime: string;
    exitTime: string;
  }>;
}

interface PerformanceMetricsProps {
  portfolioValue?: number;
  suiPrice?: number;
  address: string;
}

interface FundsChartProps {
  latestTokenValue?: number;
  suiPrice?: number;
}

export default function PerformanceMetrics({ address, portfolioValue, suiPrice, walletIn }: PerformanceMetricsProps) {
  const [metrics, setMetrics] = useState<BacktestResult>({
    initialBalance: 0,
    finalBalance: 0,
    totalReturn: 0,
    hodl: 0,
    trades: [],
  });
  const [tokensInCirculation, setTokensInCirculation] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [walletStatus, setWalletStatus] = useState<number>(0);

  const loadWalletData = useCallback(async () => {
    try {

      const { tokens, totalValue, totalGBPValue, error } = await getWalletData(address);
      tokens.forEach(token => {
        if (token.symbol === "USDC") {
          if (token.balance / 1000000 < 10) {
            setWalletStatus(1);
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

    if (walletIn !== undefined) {
      setWalletStatus(walletIn);
      setTokensInCirculation(tokensInCirculation);

    }
  }, [walletIn]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch backtest data
        const [backtestResponse, pricesResponse] = await Promise.all([
          fetch('/backtests/latest.json'),
          fetch('/api/price-history')
        ]);

        if (backtestResponse.ok) {
          const backtestData = await backtestResponse.json();
          setMetrics(backtestData);
        }

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

  if (!metrics) {
    return null;
  }

  const formatTimeSince = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
      second: 1
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return interval === 1 ? `${interval} ${unit} ago` : `${interval} ${unit}s ago`;
      }
    }

    return 'just now';
  };

  const lastTrade = metrics.trades.length > 0 ? metrics.trades[metrics.trades.length - 1] : null;
  const firstTrade = metrics.trades.length > 0 ? metrics.trades[0] : null;

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
      <div className="wallet-card small-height">
        <div className="wallet-header">
          <h2>Total Trading Volume</h2>
        </div>
        <div className="balance-amount">$179,921</div>

      </div>



    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';

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

export function PerformanceMetrics() {
  const [metrics, setMetrics] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/backtests/latest.json');
        if (!response.ok) {
          throw new Error('Failed to fetch metrics');
        }
        const data: BacktestResult = await response.json();
        setMetrics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (loading) {
    return <div className="text-center py-4">Loading metrics...</div>;
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
    <div className="flex flex-row gap-4 mb-8 w-full">
       {firstTrade && (
        <div className="flex-1 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 border border-gray-800">
          <h3 className="text-sm font-medium text-gray-400 mb-1">First Trade</h3>
          <p className="text-2xl font-semibold text-green-400" title={new Date(firstTrade.entryTime).toLocaleString()}>
            {formatTimeSince(firstTrade.entryTime)}
          </p>
        </div>
      )}
       {lastTrade && (
        <div className="flex-1 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 border border-gray-800">
          <h3 className="text-sm font-medium text-gray-400 mb-1">Last Trade</h3>
          <p className="text-2xl font-semibold text-green-400" title={new Date(lastTrade.exitTime).toLocaleString()}>
            {formatTimeSince(lastTrade.exitTime)}
          </p>
        </div>
      )}
      <div className="flex-1 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 border border-gray-800">
        <h3 className="text-sm font-medium text-gray-400 mb-1">Recent Backtest Return</h3>
        <p className="text-2xl font-semibold text-green-400">
          {metrics.totalReturn.toFixed(2)}%
        </p>
      </div>
      <div className="flex-1 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 border border-gray-800">
        <h3 className="text-sm font-medium text-gray-400 mb-1">HODL Return</h3>
        <p className="text-2xl font-semibold text-blue-400">
          {metrics.hodl.toFixed(2)}%
        </p>
      </div>
    </div>
  );
}

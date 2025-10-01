'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { AnimatedNumber } from './AnimatedNumber';
import { Line } from 'react-chartjs-2';
import { getWalletData, formatBalance } from '../lib/walletData';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

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

// Separate component for the funds chart
interface FundsChartProps {
  latestTokenValue?: number;
  suiPrice?: number;
}

function FundsChart({ latestTokenValue, suiPrice }: FundsChartProps) {
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [suiPriceData, setSuiPriceData] = useState<{ date: string, price: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch both price history and SUI price data in parallel
        const [priceResponse, suiResponse] = await Promise.all([
          fetch('/api/price-history'),
          fetch('/api/token-price?token=SUI&days=30') // Assuming you have an endpoint for SUI price history
        ]);

        if (!priceResponse.ok || !suiResponse.ok) {
          throw new Error(`Error fetching data: ${priceResponse.status} ${suiResponse.status}`);
        }

        const [priceData, suiData] = await Promise.all([
          priceResponse.json(),
          suiResponse.json()
        ]);

        setPriceData(priceData.data);
        setSuiPriceData(suiData.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Process the data for the chart
  const chartData = useMemo(() => {
    if (!priceData.length) return null;

    // Sort data by date in ascending order and filter to only include data from Sep 13, 2025 onwards
    const minDate = new Date('2025-09-13T00:00:00').getTime();
    const sortedAndFilteredData = [...priceData]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .filter(item => new Date(item.date).getTime() >= minDate);

    if (sortedAndFilteredData.length === 0) return null;

    // Make a copy of the data to avoid mutating the original
    const chartData = [...sortedAndFilteredData];

    // If we have a latest token value, update the most recent data point
    if (latestTokenValue !== undefined && chartData.length > 0) {
      const latestDataPoint = { ...chartData[chartData.length - 1] };
      if (latestDataPoint) {
        latestDataPoint.FUNDS = latestTokenValue * (1000000 - latestDataPoint.TOKENS_AVAILABLE);
        chartData[chartData.length - 1] = latestDataPoint;
      }
    }

    const labels = chartData.map(item => item.date);

    // Calculate the share price: FUNDS / (1000000 - TOKENS_AVAILABLE)
    const sharePrices = chartData.map(item => {
      const denominator = 1000000 - item.TOKENS_AVAILABLE;
      return denominator > 0 ? item.FUNDS / denominator : 0;
    });

    // Prepare SUI price data
    const suiPrices = suiPriceData
      .filter(item => new Date(item.date).getTime() >= minDate)
      .map(item => ({
        x: item.date,
        y: item.price
      }));

    // If we have a current SUI price, update the most recent data point
    if (suiPrice && suiPrices.length > 0) {
      suiPrices[suiPrices.length - 1].y = suiPrice;
    }

    return {
      labels,
      datasets: [
        {
          label: 'Share Price',
          data: sharePrices.map((price, index) => ({
            x: labels[index],
            y: price
          })),
          borderColor: 'rgba(96, 165, 250, 0.8)',
          backgroundColor: 'rgba(96, 165, 250, 0.1)',
          borderWidth: 2,
          tension: 0.3,
          yAxisID: 'y',
        },
        {
          label: 'SUI Price',
          data: suiPrices,
          borderColor: 'rgba(168, 85, 247, 0.8)',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          borderWidth: 2,
          borderDash: [5, 5],
          tension: 0.3,
          yAxisID: 'y1',
        },
      ],
    };
  }, [priceData]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 8,
                maximumFractionDigits: 8,
              }).format(context.parsed.y);
            }
            return label;
          }
        }
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#9CA3AF',
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: '#60a5fa',
          callback: function (value: any) {
            return new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 8,
              maximumFractionDigits: 8,
            }).format(value);
          },
        },
        title: {
          display: true,
          text: 'Share Price (USD)',
          color: '#9CA3AF',
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: '#a855f7',
          callback: function (value: any) {
            return new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(value);
          },
        },
        title: {
          display: true,
          text: 'SUI Price (USD)',
          color: '#9CA3AF',
        },
      }
    },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-gray-400">Loading chart data...</div>
      </div>
    );
  }

  if (!chartData) {
    console.log('No chart data available. Price data:', priceData);
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-2">
        <div className="text-gray-400">No chart data available</div>
        <div className="text-xs text-gray-500">Data points: {priceData.length}</div>
      </div>
    );
  }

  return <Line options={options} data={chartData} />;
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
      console.log(tokens);
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
      <div className="flex flex-row gap-4 w-full">

        <div title={portfolioValue.toString()} className="flex-1 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 border border-gray-800">
          <h3 className="text-sm font-medium text-gray-400 mb-1">Live Net Asset Value (NAV)</h3>
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
        <div title={(portfolioValue / tokensInCirculation).toString()} className="flex-1 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 border border-gray-800">
          <h3 className="text-sm font-medium text-gray-400 mb-1">Live Share Price</h3>
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

        <div title={(1000000 - (tokensInCirculation || 0)).toString()} className="flex-1 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 border border-gray-800">
          <h3 className="text-sm font-medium text-gray-400 mb-1">Shares available</h3>
          <p className="text-2xl font-semibold text-blue-400">
            <AnimatedNumber
              value={1000000 - tokensInCirculation || 0}
              reverse={true}
              duration={300000}
              className="text-2xl font-semibold inline-block"
              decimalPlaces={9}
              showDirectionColor={true}
              currency=""
            />


          </p>
        </div>
        <div title={suiPrice.toString()} className="flex-1 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 border border-gray-800">
          <h3 className="text-sm font-medium text-gray-400 mb-1">Live SUI Price</h3>
          {suiPrice !== undefined ? (
            <AnimatedNumber
              value={suiPrice}
              duration={300000}
              className="text-2xl font-semibold inline-block"
              decimalPlaces={5}
              showDirectionColor={true}
              currency="USD"
            />
          ) : (
            <p className="text-2xl font-semibold text-blue-400">Loading...</p>
          )}
        </div>
        <div className="flex-1 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 border border-gray-800" style={{ backgroundColor: walletStatus >= 1 ? '#0E7C7B' : '#D62246' }}>
          <h3 className="text-sm font-medium text-gray-400 mb-1">Current status</h3>
          {walletStatus >= 1 ? (
            <p className="text-2xl font-semibold text-blue-400">Active in trade</p>
          ) : (
            <p className="text-2xl font-semibold text-blue-400">Waiting for buy signal</p>
          )}
        </div>
      </div>
      <p className="text-xs text-gray-400" style={{ fontSize: '12px' }}>*Live prices may be delayed by up to 5 minutes. These figures are illustrative only, based on hypothetical assumptions. Past performance is not a reliable indicator of future results. Your capital is at risk and you may lose some or all of your investment.</p>

      <div className="w-full mb-8">
        <h3 className="text-lg font-medium mb-4">Share Price Over Time</h3>
        <div className="h-120 w-full bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 border border-gray-800">
          <FundsChart
            latestTokenValue={tokensInCirculation && portfolioValue ? portfolioValue / tokensInCirculation : undefined}
            suiPrice={suiPrice}
          />
        </div>
      </div>
    </div>
  );
}

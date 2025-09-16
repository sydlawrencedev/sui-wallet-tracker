'use client';

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
  type InteractionMode,
} from 'chart.js';
import { useEffect, useState } from 'react';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PriceData {
  date: string;
  USDC: number;
  SUI: number;
  GBP: number;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const chartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as InteractionMode,
    intersect: false,
  },
  plugins: {
    legend: {
      display: true,
      position: 'top' as const,
      labels: {
        color: '#9CA3AF',
        font: {
          family: 'Inter, sans-serif',
        },
        usePointStyle: true,
      },
    },
    tooltip: {
      mode: 'index' as const,
      intersect: false,
      backgroundColor: '#1F2937',
      titleColor: '#F3F4F6',
      bodyColor: '#E5E7EB',
      borderColor: '#4B5563',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
      callbacks: {
        label: (context: any) => {
          let label = context.dataset.label || '';
          if (label) {
            label += ': ';
          }
          if (context.parsed.y !== null) {
            if (label.includes('GBP')) {
              label += new Intl.NumberFormat('en-GB', { 
                style: 'currency', 
                currency: 'GBP' 
              }).format(context.parsed.y);
            }
          }
          return label;
        }
      }
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        color: '#9CA3AF',
        maxRotation: 0,
        autoSkip: true,
        maxTicksLimit: 10,
      },
      border: {
        display: false,
      },
    },
    y: {
      type: 'linear' as const,
      display: true,
      position: 'left' as const,
      grid: {
        color: 'rgba(75, 85, 99, 0.1)',
      },
      ticks: {
        color: '#9CA3AF',
        callback: (value: string | number) => 
          new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: 'USD',
            maximumFractionDigits: 4 
          }).format(Number(value)),
      },
      border: {
        display: false,
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
        color: '#9CA3AF',
        callback: (value: string | number) => 
          new Intl.NumberFormat('en-GB', { 
            style: 'currency', 
            currency: 'GBP',
            maximumFractionDigits: 4 
          }).format(Number(value)),
      },
    },
  },
};

const PriceCharts = () => {
  const [activeTab, setActiveTab] = useState('1d');
  const [chartData, setChartData] = useState({
    labels: [] as string[],
    datasets: [
      {
        label: 'SUI/USD',
        data: [] as number[],
        borderColor: '#6366F1',
        backgroundColor: '#6366F120',
        borderWidth: 2,
        tension: 0.4,
        fill: false,
        pointRadius: 0,
        yAxisID: 'y',
      },
      {
        label: 'GBP/USD',
        data: [] as number[],
        borderColor: '#10B981',
        backgroundColor: '#10B98120',
        borderWidth: 2,
        tension: 0.4,
        fill: false,
        pointRadius: 0,
        yAxisID: 'y1',
      }
    ],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPriceData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/price-history');
        if (!response.ok) {
          throw new Error('Failed to fetch price data');
        }
        const { data } = await response.json();
        
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error('No price data available');
        }
        
        // Sort data by date (oldest first)
        const sortedData = [...data].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        
        // Prepare chart data
        const labels = sortedData.map(item => {
          const date = new Date(item.date);
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });
        
        setChartData({
          labels,
          datasets: [
            {
              ...chartData.datasets[0],
              data: sortedData.map(item => item.SUI),
            },
            {
              ...chartData.datasets[1],
              data: sortedData.map(item => 1 / item.GBP), // Convert to GBP/USD
            }
          ],
        });
        
      } catch (err) {
        console.error('Error fetching price data:', err);
        setError('Failed to load price data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPriceData();
  }, []);

  if (isLoading) {
    return (
      <div className="w-full bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 border border-gray-800 shadow-lg mb-8">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-800 rounded w-1/3 mb-6"></div>
          <div className="h-80 bg-gray-800 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700/50 text-red-200 rounded-lg p-4 mb-8">
        <p className="font-medium">Error loading price data</p>
        <p className="text-sm text-red-400 mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 border border-gray-800 shadow-lg mb-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-200">SUI/USD Price</h3>
        <div className="flex space-x-2">
          {['1d', '1w', '1m', '3m', '1y'].map((period) => (
            <button
              key={period}
              onClick={() => setActiveTab(period)}
              className={`px-3 py-1 text-sm rounded-md ${
                activeTab === period
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
              }`}
            >
              {period.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div className="h-196 relative">
        <div className="absolute inset-0">
          <Line height="300" data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
};

export default PriceCharts;

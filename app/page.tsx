'use client';

import { WalletInfo } from '@/components/WalletInfo';
import { TransactionList } from '@/components/TransactionList';
import { PerformanceMetrics } from '@/components/PerformanceMetrics';
import dynamic from 'next/dynamic';

// Dynamically import the PriceCharts component with SSR disabled
const PriceCharts = dynamic(
  () => import('@/components/PriceCharts').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="w-full bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 border border-gray-800 shadow-lg mb-8">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-800 rounded w-1/3 mb-6"></div>
          <div className="h-80 bg-gray-800 rounded"></div>
        </div>
      </div>
    ),
  }
);

// Hardcoded SUI wallet address for demonstration
const DEFAULT_SUI_ADDRESS = process.env.NEXT_PUBLIC_DEFAULT_SUI_ADDRESS || '';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-900 text-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header with gradient text */}
        <header className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400 mb-4">
            AT2000i
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
          AT1000i, the Auto Trader 1000 Intelligence, by Minith Labs, is a cutting-edge AI / ML algorithmic trading bot that uses advanced machine learning techniques to identify profitable trading opportunities in the SUI/USDC market. AT1000i will uses the 5 minute OHLC candles to generate signals.

          </p>
        </header>

        <div className="space-y-8">
          {/* Main Chart */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-800 shadow-2xl">
            <h2 className="text-xl font-semibold text-gray-200 mb-4">Trading Strategy Performance</h2>
            <div className="overflow-hidden rounded-xl border border-gray-800">
              <img 
                src="/backtests/strategy_chart-SUI-USD-h3ka.png" 
                alt="Strategy Chart" 
                className="w-full h-auto"
                style={{ aspectRatio: '16/9', maxWidth: '100%'}}
              />
            </div>
          </div>

          <PerformanceMetrics />

          {/* Price Charts */}
          <PriceCharts />

          {/* Wallet Info and Transactions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-800 shadow-xl">
              <h2 className="text-xl font-semibold text-gray-200 mb-6">Wallet Overview</h2>
              <WalletInfo address={DEFAULT_SUI_ADDRESS} />
            </div>
            
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-800 shadow-xl">
              <h2 className="text-xl font-semibold text-gray-200 mb-6">Recent Transactions</h2>
              <div className="max-h-[600px] overflow-y-auto pr-2">
                <TransactionList address={DEFAULT_SUI_ADDRESS} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

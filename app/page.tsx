'use client';

import Link from 'next/link';
import { WalletInfo } from '@/components/WalletInfo';
import { TransactionList } from '@/components/TransactionList';
import PerformanceMetrics from '@/components/PerformanceMetrics';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

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

// Image component with auto-refresh
function AutoRefreshImage({ src, ...props }: { src: string; [key: string]: any }) {
  const [imgSrc, setImgSrc] = useState(src);

  useEffect(() => {
    // Update image source with timestamp to force refresh
    const updateImage = () => {
      setImgSrc(`${src}?t=${new Date().getTime()}`);
    };

    // Initial load
    updateImage();

    // Refresh every 1 minute
    const interval = setInterval(updateImage, 1 * 60 * 1000);
    
    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [src]);

  return <img src={imgSrc} {...props} />;
}

// Hardcoded SUI wallet address for demonstration
const DEFAULT_SUI_ADDRESS = process.env.NEXT_PUBLIC_DEFAULT_SUI_ADDRESS || '';

export default function Home() {
  const [portfolioValue, setPortfolioValue] = useState<number>(0);
  const [suiPrice, setSuiPrice] = useState<number>(0);
  
  // Fetch latest SUI price
  useEffect(() => {
    const fetchSuiPrice = async () => {
      try {
        const response = await fetch('/api/token-price?token=SUI');
        if (response.ok) {
          const data = await response.json();
          setSuiPrice(data.price || 0);
        }
      } catch (error) {
        console.error('Error fetching SUI price:', error);
      }
    };
    
    fetchSuiPrice();
    // Refresh price every 5 minutes
    const interval = setInterval(fetchSuiPrice, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-900 text-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header with gradient text */}
        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 mb-4">
            AT1000i &alpha; Investment Fund
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto mb-6">
            AT1000i, the Auto Trader 1000 Intelligence, by Minith Labs, is a cutting-edge AI / ML algorithmic trading web3 protocol that uses advanced machine learning techniques to identify profitable trading opportunities in the SUI/USDC market. AT1000i uses 15 minute OHLC candles to generate signals.
          </p>
          <p className="text-red-400 font-medium">
          Capital is at risk. Investors may lose all or part of their investment. Past performance is not a reliable indicator of future results. Investments in unlisted securities are illiquid and may be difficult to realise. This is not a public offer. Only professional investors, certified high net worth individuals or self-certified sophisticated investors should consider investing in AT1000i.
        </p>
        <p><a href={"https://suiscan.xyz/mainnet/account/"+DEFAULT_SUI_ADDRESS} target="_blank">View on SuiScan</a></p>

          <div className="flex space-x-6">
            <Link 
              href="/how" 
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              How to invest
            </Link>
          </div>
        </header>

        <div className="space-y-8">

          <PerformanceMetrics portfolioValue={portfolioValue} suiPrice={suiPrice} />



      

          {/* Main Chart */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-800 shadow-2xl">
            <h2 className="text-xl font-semibold text-gray-200 mb-4">Trading Strategy Performance</h2>
            <div className="overflow-hidden rounded-xl border border-gray-800">
              <AutoRefreshImage 
                src="/backtests/strategy_chart-SUI-USD-h3ka-15min.png"
                alt="Strategy Chart" 
                className="w-full h-auto"
                style={{ aspectRatio: '16/9', maxWidth: '100%', maxHeight: '100%' }}
              />
            </div>
          </div>


          {/* <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-800 shadow-xl">
            <h2 className="text-xl font-semibold text-gray-200 mb-6">Recent Transactions</h2>
            <div className="max-h-[600px] overflow-y-auto pr-2">
              <TransactionList address={DEFAULT_SUI_ADDRESS} />
            </div>
          </div> */}



          {/* Wallet Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-800 shadow-xl">
              <h2 className="text-xl font-semibold text-gray-200 mb-6">Wallet Overview</h2>
              <WalletInfo 
                address={DEFAULT_SUI_ADDRESS} 
                onTotalValueChange={setPortfolioValue} 
              />
            </div>
            
            
          </div>
        </div>
      </div>
    </main>
  );
}

'use client';

import Link from 'next/link';
import { WalletInfo } from '@/components/WalletInfo';
import PerformanceMetrics from '@/components/PerformanceMetrics';
import { FundsChart } from '@/components/FundsChart';
import { useEffect, useState } from 'react';
import Image, { ImageProps } from 'next/image';

// Image component with auto-refresh
interface AutoRefreshImageProps extends Omit<ImageProps, 'src' | 'alt'> {
  src: string;
  alt: string;
}

function AutoRefreshImage({ src, alt, ...props }: AutoRefreshImageProps) {
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

  return <Image src={imgSrc} alt={alt} width={500} height={300} {...props} />;
}

// Hardcoded SUI wallet address for demonstration
const DEFAULT_SUI_ADDRESS = process.env.NEXT_PUBLIC_DEFAULT_SUI_ADDRESS || '';

export default function Home() {
  const [portfolioValue, setPortfolioValue] = useState<number>(0);
  const [suiPrice, setSuiPrice] = useState<number>(0);
  const [walletStatus, setWalletStatus] = useState<number>(0);

  const walletChange = (totalValue: number) => {
    setPortfolioValue(totalValue);

    // If you need to track tokens in circulation and trading status,
    // you should fetch this data separately or modify the WalletInfo component
    // to provide this information through a different callback

    // For now, we'll just log the total value
    console.log("wallet value changed:", totalValue);
  }

  // Fetch latest SUI price
  useEffect(() => {
    const fetchSuiPrice = async () => {
      try {
        const response = await fetch('/api/token-price?token=SUI');
        if (response.ok) {
          const data = await response.json();
          setSuiPrice(data.price || 0);
          setWalletStatus(0)
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

          <p className="text-gray-400 max-w-2xl mx-auto mb-6">
            AT3000i, the Auto Trader 3000 Intelligence by Minith Labs, is a next-generation algorithmic trading protocol built for Web3 markets. It leverages state-of-the-art machine learning architectures, ranging from deep reinforcement learning to ensemble predictive modelling, to dynamically detect and exploit alpha in the SUI/USDC trading pair. The system continuously ingests high-frequency market data, on-chain liquidity flows, and cross-exchange order book dynamics, optimising execution through adaptive risk-adjusted strategies and low-latency smart contract integration.
          </p>
          <p className="text-red-400 font-medium">
            Capital is at risk. Investors may lose all or part of their investment. Past performance is not a reliable indicator of future results. Investments in unlisted securities are illiquid and may be difficult to realise. This is not a public offer. Only professional investors, certified high net worth individuals or self-certified sophisticated investors should consider investing in AT3000i.
          </p>
          <p><a href={"https://suiscan.xyz/mainnet/account/" + DEFAULT_SUI_ADDRESS} target="_blank">View on SuiScan</a></p>

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

          <PerformanceMetrics address={DEFAULT_SUI_ADDRESS} portfolioValue={portfolioValue} suiPrice={suiPrice} walletIn={walletStatus} />



          <p className="text-xs text-gray-400" style={{ fontSize: '12px' }}>*Live prices may be delayed by up to 5 minutes. These figures are illustrative only, based on hypothetical assumptions. Past performance is not a reliable indicator of future results. Your capital is at risk and you may lose some or all of your investment.</p>

          <div className="w-full mb-8">
            <h3 className="text-lg font-medium mb-4">Share Price Over Time</h3>
            <div className="h-120 w-full bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 border border-gray-800">
              <FundsChart
              //latestTokenValue={tokensInCirculation && portfolioValue ? portfolioValue / tokensInCirculation : undefined}
              //suiPrice={suiPrice}
              />
            </div>
          </div>


          {/* Main Chart */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-800 shadow-2xl">
            <h2 className="text-xl font-semibold text-gray-200 mb-4">Recent Trading Strategy Performance</h2>
            <div className="overflow-hidden rounded-xl border border-gray-800">
              <AutoRefreshImage
                src="/backtests/strategy_chart-SUI-USD-h3ka1-1min.png"
                alt="Strategy Chart"
                className="w-full h-auto"
                style={{ aspectRatio: '16/9', maxWidth: '100%', maxHeight: '100%' }}
              />
            </div>
            <p className="text-xs text-gray-400" style={{ fontSize: '12px' }}>Live prices may be delayed by up to 5 minutes. These figures are illustrative only, based on hypothetical assumptions. Past performance is not a reliable indicator of future results. Your capital is at risk and you may lose some or all of your investment.</p>

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
                onTotalValueChange={walletChange}
              />
            </div>


          </div>
        </div>
      </div>
    </main>
  );
}

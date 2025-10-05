'use client';


import { useCurrentWallet, useCurrentAccount, useAutoConnectWallet, createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { getWalletData } from '../../lib/walletData';

import { myTheme } from '../../utils/theme';

import { WalletBalance } from '../../components/WalletBalance';
import PerformanceMetrics from '../../components/PerformanceMetrics';
// Config options for the networks you want to connect to
const { networkConfig } = createNetworkConfig({
    localnet: { url: getFullnodeUrl('localnet') },
    mainnet: { url: getFullnodeUrl('mainnet') },
});

const DEFAULT_SUI_ADDRESS = process.env.NEXT_PUBLIC_DEFAULT_SUI_ADDRESS || '';


// // get the lateest wallet from a given address using this api
// /api/wallet/0xbcae8fa928ed6606f78c8d0aead213d6e76d29041337dff3b9448e953e79fb39


// Image component with auto-refresh
interface AutoRefreshImageProps {
    src: string;
    alt: string;
    className?: string;
    style?: React.CSSProperties;
}

function AutoRefreshImage({ src, alt, className, style }: AutoRefreshImageProps) {
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

    return (
        <Image
            src={imgSrc}
            alt={alt}
            className={className}
            style={style}
            width={1200}
            height={675}
            priority
        />
    );
}

const queryClient = new QueryClient();
export default function Wallet() {
    const account = false;
    const [portfolioValue, setPortfolioValue] = useState<number>(0);
    const [tokensAvailable, setTokensAvailable] = useState<number>(0);
    const [walletStatus, setWalletStatus] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const loadWalletData = useCallback(async () => {
        try {
            setIsLoading(true);
            const { tokens, totalValue, error } = await getWalletData(DEFAULT_SUI_ADDRESS);

            if (error) {
                setError(error);
                return;
            }

            const inTrade = tokens.some(token =>
                token.name === "SUI" &&
                (parseFloat(token.balance) / (10 ** token.decimals)) > 5
            );
            const tokensAvailable = tokens.some(token =>
                token.name === "AT1000i" &&
                (parseFloat(token.balance) / (10 ** token.decimals)) > 5
            );

            setWalletStatus(inTrade ? 1 : 0);
            setPortfolioValue(totalValue);
            setTokensAvailable(tokensAvailable);
            setError(null);
        } catch (err) {
            console.error('Error loading wallet data:', err);
            setError('Failed to load wallet data. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial load and set up polling
    useEffect(() => {
        const loadData = async () => {
            await loadWalletData();
        };

        loadData();
        const interval = setInterval(loadData, 5 * 60 * 1000); // Poll every 5 minutes

        return () => clearInterval(interval);
    }, [loadWalletData]);

    return (
        <QueryClientProvider client={queryClient}>
            <SuiClientProvider networks={networkConfig} defaultNetwork="mainnet">
                <WalletProvider theme={myTheme} autoConnect={true}>
                    <div>

                        <h2>
                            👋 Welcome investor!
                            -&nbsp;
                            {isLoading ? 'Loading...' : walletStatus ? "I'm actively trading" : "I'm waiting for a buy signal"}
                        </h2>

                        {error && (
                            <div className="error-message" style={{ color: 'red', margin: '10px 0' }}>
                                {error}
                            </div>
                        )}

                        {isLoading ? (
                            <div>Loading wallet data...</div>
                        ) : (
                            <WalletBalance address={account} />
                        )}
                        <div className="wallet-card main-graph">
                            {/* Main Chart */}
                            <div className="wallet-header">
                                <h2>Recent Trading Strategy Performance</h2>
                            </div>
                            <div className="overflow-hidden rounded-xl">
                                <AutoRefreshImage
                                    src="/backtests/strategy_chart-SUI-USD-h3ka1-1min.png"
                                    alt="Strategy Chart"
                                    className="w-full h-auto"
                                    style={{ aspectRatio: '16/9', maxWidth: '100%', maxHeight: '100%' }}
                                />
                            </div>


                        </div>

                        <PerformanceMetrics address={DEFAULT_SUI_ADDRESS} portfolioValue={portfolioValue} tokensAvailable={tokensAvailable} walletIn={walletStatus} />

                    </div>
                </WalletProvider>
            </SuiClientProvider>
        </QueryClientProvider>
    );
}
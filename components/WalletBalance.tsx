'use client';

import { useEffect, useState } from 'react';
import { getWalletData } from '../lib/walletData';
import { apiFetch } from '../utils/api';

import { FundsChart } from './FundsChart';
// import { ConnectButton } from '@suiet/wallet-kit';
import { DepositForm } from './DepositForm';

interface Tokens {
    usdc: string;
    at1000i: string;
}

import type { Account } from '../lib/types';

export function WalletBalance({ address }: { address: Account | null | false }) {
    const [tokens, setTokens] = useState<Tokens | null>({
        usdc: "0",
        at1000i: "0"
    });

    const [loading, setLoading] = useState(false);
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [sharePrice, setSharePrice] = useState<number>(0);

    const [previousSharePrice, setPreviousSharePrice] = useState<number>(0);

    const [isDepositOpen, setIsDepositOpen] = useState(false);


    const handleDeposit = async (amount: number) => {
        try {
            // Call your deposit API here
            console.log('Depositing:', amount);

            // Close the deposit form
            setIsDepositOpen(false);

            // Show success message (you might want to use a toast notification instead)
            alert('Deposit successful!');
        } catch (error) {
            console.error('Deposit error:', error);
            alert('Deposit failed. Please try again.');
        }
    };

    useEffect(() => {
        // if (!address || !address.address) return;

        let isMounted = true;
        const controller = new AbortController();
        const signal = controller.signal;

        const fetchData = async () => {
            if (!isMounted) return;

            try {
                setLoading(true);
                setError(null);

                if (!isMounted) return;

                // Process price data
                const [pricesResponse] = await Promise.all([
                    fetch('/api/price-history', { signal })
                ]);
                const prices = await pricesResponse.json();
                if (prices?.data?.length > 0) {
                    const previousData = prices.data[Math.min(7, prices.data.length - 1)];
                    const latestData = prices.data[0];
                    const latestSharePrice = latestData.FUNDS / (1000000 - (latestData.TOKENS_AVAILABLE || 0));
                    const previousSharePriceValue = previousData.FUNDS / (1000000 - (previousData.TOKENS_AVAILABLE || 0));

                    setSharePrice(latestSharePrice);
                    setPreviousSharePrice(previousSharePriceValue);
                }

                if (address && address.address) {
                    // Fetch wallet data and prices in parallel
                    const [walletData] = await Promise.all([
                        getWalletData(address.address)
                    ]);
                    // Process wallet data
                    const newTokens = { usdc: "0", at1000i: "0" };
                    walletData.tokens?.forEach((token) => {
                        if (token.symbol === "USDC") newTokens.usdc = token.balance;
                        if (token.symbol === "AT1000i") newTokens.at1000i = token.balance;
                    });
                    setTokens(newTokens);
                }
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Error fetching data:', err);
                    setError('Failed to load wallet data');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        // Initial fetch
        fetchData();

        // Set up polling with cleanup
        const interval = setInterval(fetchData, 5 * 60 * 1000); // Poll every 5 minutes

        // Cleanup function
        return () => {
            isMounted = false;
            controller.abort();
            clearInterval(interval);
        };
    }, [(address) ? address?.address : '']); // Only depend on address.address

    // if (!address) {
    //     return null;
    // }

    if (loading) {
        return (
            <div className="mt-4 p-4 bg-gray-800 rounded-lg">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-700 rounded w-1/4 mb-2"></div>
                    <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mt-4 p-4 bg-red-900/20 text-red-400 rounded-lg">
                {error}
            </div>
        );
    }

    return (
        <div className="single-column">
            <div className="wallet-card two-thirds">
                <div className="wallet-header">
                    {(address && address.address) && (
                        <h2>α Fund - Your balance</h2>
                    )}
                    {(!address || !address.address) && (
                        <h2>α Fund - Overall performance</h2>
                    )}
                </div>

                <div className="token-amount">

                    {(address && address.address) && (
                        <div>
                            {(Number(tokens.at1000i) / 1000000000).toLocaleString("en-US")}
                            &nbsp;shares
                        </div>
                    )}
                    {(!address || !address.address) && (
                        <div>
                            Share price
                        </div>
                    )}
                </div>
                <div className="balance-amount">
                    {(address && address.address) && (
                        <div>
                            ${Math.floor((Math.floor(sharePrice * 100) / 100 * (Number(tokens.at1000i) / 1000000000))).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                        </div>
                    )}
                    {(!address || !address.address) && (
                        <div>
                            ${((Math.ceil((sharePrice * 100)) / 100)).toLocaleString("en-US", { maximumFractionDigits: 2 })}
                        </div>
                    )}
                </div>

                <div className={(((sharePrice - previousSharePrice) / previousSharePrice * 100) > 0 ? "balance-change positive" : "balance-change negative")}>
                    <span>
                        {(((sharePrice - previousSharePrice) / previousSharePrice * 100) > 0 ? "+" : "")}{((sharePrice - previousSharePrice) / previousSharePrice * 100).toFixed(2)}% this week
                    </span>
                </div>
                <div className="chart-placeholder">
                    <FundsChart
                        latestTokenValue={sharePrice}
                    />
                </div>
            </div>
            <div className="wallet-card small-height">

                {(!address || !address.address) && (
                    <div>
                        <p>Let&apos;s make more money!</p>
                        <p>Capital is at risk. Min deposit $100</p>
                        <div className="wallet-actions">
                            <p>Connect wallet button</p>
                        </div>
                    </div>
                )}



                {(address && address.address) && !isDepositOpen && Number(tokens.usdc) / 1000000 < 1 && (
                    <p>You have no free funds, add USDC to your wallet.</p>
                )}
                {(address && address.address) && !isDepositOpen && Number(tokens.usdc) / 1000000 >= 1 && (
                    <p>You have ${(Number(tokens.usdc) / 1000000).toFixed(0)} not making you money.</p>
                )}
                {(address && address.address) && (
                    <DepositForm
                        isOpen={isDepositOpen}
                        onClose={() => setIsDepositOpen(false)}
                        maxAmount={parseInt(tokens?.usdc || '0')}
                        onDeposit={handleDeposit}
                        fxRate={sharePrice}
                        tokens={tokens}
                    />

                )}


                {(address && address.address) && !isDepositOpen && !isWithdrawOpen && (
                    <div className="wallet-actions">
                        <button
                            className={Number(tokens.usdc) / 1000000 < 100 ? 'btn-primary disabled' : 'btn-primary'}
                            title={Number(tokens.usdc) / 1000000 < 100 ? 'No funds to deposit' : ''}
                            onClick={() => Number(tokens.usdc) / 1000000 >= 100 && setIsDepositOpen(true)}
                            disabled={Number(tokens.usdc) / 1000000 < 100}
                        >
                            Deposit Funds
                        </button>
                        <button className={Number(tokens.at1000i) > 0 ? "btn-outline" : "btn-outline disabled"} title={Number(tokens.at1000i) > 0 ? '' : 'No shares to withdraw'} onClick={() => Number(tokens.at1000i) > 0 && setIsWithdrawOpen(true)} disabled={Number(tokens.at1000i) <= 0} > Withdraw</button>

                    </div>
                )}

                {(address && address.address) && (
                    <p>Capital is at risk. Min deposit $100</p>
                )}


            </div>
        </div >
    )


}

'use client';

import { useEffect, useState } from 'react';
import { FundsChart } from './FundsChart';
import { DepositForm } from './DepositForm';
import { ConnectButton, useConnectWallet } from '@mysten/dapp-kit';

interface Tokens {
    usdc: string;
    at1000i: string;
}

interface Account {
    address: string;
}

export function WalletBalance(address: Account) {
    const [tokens, setTokens] = useState<Tokens | null>({
        usdc: "0",
        at1000i: "0"
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [sharePrice, setSharePrice] = useState<number>(0);

    const [previousSharePrice, setPreviousSharePrice] = useState<number>(0);

    const [isDepositOpen, setIsDepositOpen] = useState(false);

    const currentAccount = useConnectWallet();
    console.log(currentAccount);

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

        const fetchPriceHistory = async () => {
            try {
                // Fetch backtest data
                const [pricesResponse] = await Promise.all([
                    fetch('/api/price-history')
                ]);

                if (pricesResponse.ok) {
                    const { data: prices } = await pricesResponse.json();
                    if (prices && prices.length > 0) {
                        // Get the most recent price data
                        const previousData = prices[Math.min(7, prices.length - 1)]

                        const latestData = prices[0];
                        console.log("got latest data,", latestData)
                        setSharePrice(latestData.FUNDS / (1000000 - (latestData.TOKENS_AVAILABLE || 0)));
                        setPreviousSharePrice(previousData.FUNDS / (1000000 - (previousData.TOKENS_AVAILABLE || 0)));
                    }
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        }
        fetchPriceHistory();
        if (!address.address) {

            return;
        }


        const fetchWalletData = async () => {
            try {
                setError(null);

                const response = await fetch(`/api/wallet/${address.address}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch wallet data');
                }
                const data = await response.json();


                data?.tokens?.forEach((token) => {
                    if (token.symbol === "USDC") {
                        tokens.usdc = token.balance;
                    }
                    if (token.symbol === "AT1000i") {
                        tokens.at1000i = token.balance;
                    }
                });

                setTokens(tokens);
            } catch (err) {
                console.error('Error fetching wallet data:', err);
                setError('Failed to load wallet data');
            } finally {
                setLoading(false);
            }
        };

        fetchWalletData();
        const interval = setInterval(fetchWalletData, 30000);
        return () => clearInterval(interval);
    }, [address, tokens]);

    if (!address) {
        return null;
    }

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
                    {(address.address) && (
                        <h2>α Fund - Your balance</h2>
                    )}
                    {(!address.address) && (
                        <h2>α Fund - Overall performance</h2>
                    )}
                </div>

                <div className="token-amount">

                    {(address.address) && (
                        <div>
                            {(tokens.at1000i / 1000000000).toLocaleString("en-US")}
                            &nbsp;shares
                        </div>
                    )}
                    {(!address.address) && (
                        <div>
                            Share price
                        </div>
                    )}
                </div>
                <div className="balance-amount">
                    {(address.address) && (
                        <div>
                            ${Math.floor((sharePrice * (tokens.at1000i / 1000000000))).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                        </div>
                    )}
                    {(!address.address) && (
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

                {!address.address && (
                    <div>
                        <p>Let&apos;s make more money!</p>
                        <p>Capital is at risk. Min deposit $100</p>
                        <div className="wallet-actions">
                            <ConnectButton className="btn-primary" />
                        </div>
                    </div>
                )}



                {address.address && !isDepositOpen && tokens.usdc / 1000000 < 1 && (
                    <p>You have no free funds, add USDC to your wallet.</p>
                )}
                {address.address && !isDepositOpen && tokens.usdc / 1000000 >= 1 && (
                    <p>You have ${(tokens.usdc / 1000000).toFixed(0)} not making you money.</p>
                )}
                {address.address && (
                    <DepositForm
                        isOpen={isDepositOpen}
                        onClose={() => setIsDepositOpen(false)}
                        maxAmount={parseInt(tokens?.usdc || '0')}
                        onDeposit={handleDeposit}
                        fxRate={sharePrice}
                        tokens={tokens}
                    />

                )}


                {address.address && !isDepositOpen && (
                    <div className="wallet-actions">
                        <button
                            className={tokens.usdc / 1000000 < 100 ? 'btn-primary disabled' : 'btn-primary'}
                            title={tokens.usdc / 1000000 < 100 ? 'No funds to deposit' : ''}
                            onClick={() => tokens.usdc / 1000000 >= 100 && setIsDepositOpen(true)}
                            disabled={tokens.usdc / 1000000 < 100}
                        >
                            Deposit Funds
                        </button>
                        <button className={tokens.at1000i > 0 ? "btn-outline" : "btn-outline disabled"} title={tokens.at1000i > 0 ? '' : 'No shares to withdraw'} onClick={() => tokens.at1000i > 0 && setIsWithdrawOpen(true)} disabled={tokens.at1000i <= 0} > Withdraw</button>

                    </div>
                )}

                {address.address && (
                    <p>Capital is at risk. Min deposit $100</p>
                )}


            </div>
        </div >
    )


}

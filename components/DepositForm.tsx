'use client';

import { useState, useEffect } from 'react';

export function DepositForm({ isOpen, onClose, maxAmount, onDeposit, fxRate, tokens }: { isOpen: boolean; onClose: () => void; maxAmount: number; onDeposit: (amount: number) => void, fxRate: number, tokens: { usdc: string, at1000i: string } }) {
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // Allow only numbers and one decimal point
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
            setAmount(value);
            setError('');
        }
    };

    const handleMaxClick = () => {
        setAmount((maxAmount / 1000000).toString());
        setError('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            setError('Please enter a valid amount');
            return;
        }
        if (numAmount * 1000000 > maxAmount) {
            setError('Insufficient balance');
            return;
        }
        onDeposit(numAmount * 1000000); // Convert back to base units
    };

    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'auto';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    if (isWithdrawOpen) return null;

    return (



        <form onSubmit={handleSubmit}>
            <div>
                <div className="flex justify-between items-center mb-2">
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-300">
                        Amount
                    </label>
                    <button
                        type="button"
                        onClick={handleMaxClick}
                        className="btn text-sm text-blue-400 hover:text-blue-300 btn-no-outline"
                    >
                        Max: {(maxAmount / 1000000).toFixed(2)} USDC
                    </button>
                </div>
                <div className="relative rounded-md shadow-sm">
                    <input
                        type="text"
                        name="amount"
                        id="amount"
                        className="block w-full pl-3 pr-12 py-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                        value={amount}
                        onChange={handleAmountChange}
                        autoComplete="off"
                    />

                </div>
                {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
            </div>
            {Math.floor(Number(amount))}
            {Math.floor(Number(amount)) < 100 && (
                <div className="bg-gray-700 p-4 rounded-lg mb-6">

                    <div className="flex justify-between mb-2">
                        <span className="text-sm text-red-500">Min 100 USDC</span>

                    </div>

                </div>
            )}

            {Math.floor(Number(amount)) >= 100 && (

                <div className="bg-gray-700 p-4 rounded-lg mb-6">

                    <div className="flex justify-between mb-2">
                        <span className="text-sm text-gray-400">You will receive</span>
                        <span className="text-sm font-medium text-white">
                            {amount ? (Math.floor(Number(amount) / fxRate)) : '0.00'} AT1000i
                        </span>
                    </div>

                </div>
            )}

            <div className="wallet-actions">
                <button
                    type="submit"
                    onClick={handleSubmit}
                    className={Math.floor(Number(amount)) < 100 ? "btn-primary disabled" : "btn-primary"}
                >
                    Deposit USDC
                </button>
                <button className={Number(tokens.at1000i) > 0 ? "btn-outline" : "btn-outline disabled"} title={Number(tokens.at1000i) > 0 ? '' : 'No shares to withdraw'} onClick={() => Number(tokens.at1000i) > 0 && setIsWithdrawOpen(true)} disabled={Number(tokens.at1000i) <= 0} > Withdraw</button>
            </div>
        </form>

    );
}

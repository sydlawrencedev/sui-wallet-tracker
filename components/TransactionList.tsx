'use client';

import { useState, useEffect, useCallback } from 'react';
import React from 'react';
// Function to download data as a file
const downloadFile = (data: any, filename: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
import { fetchAllWalletTransactions, processTransactionData } from '@/services/suiExplorer';
import { DateRangePicker } from './DateRangePicker';

export interface TokenTransfer {
  amount: string;
  token: string;
  usdValue?: number;
  decimals?: number;
  from?: string;
  to?: string;
}

export interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'swap' | 'batch';
  status: 'success' | 'failure' | 'pending';
  timestamp: number;
  transfers: TokenTransfer[];
  usdValue: number;
  profitLoss: number;
  raw?: any; // For debugging
  protocol?: string;
  isSwap?: boolean;
}

interface TransactionListProps {
  address: string;
}

export function TransactionList({ address }: TransactionListProps) {
  const currentYear = new Date().getFullYear();
  const [dateRange, setDateRange] = useState({
    start: new Date(currentYear, 0, 1), // January 1st of current year
    end: new Date(),
  });
  const [transactions, setTransactions] = useState<[string, Transaction[]][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalProfitLoss, setTotalProfitLoss] = useState(0);

  const fetchTransactions = useCallback(async () => {
    if (!address) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Convert dates to timestamps in milliseconds
      const startTime = dateRange.start.getTime();
      const endTime = dateRange.end.getTime() + (24 * 60 * 60 * 1000 - 1); // End of the day
      
      // Fetch transactions from the Sui blockchain
      const rawTransactions = await fetchAllWalletTransactions(address, startTime, endTime);
      
      console.log('Raw transactions from API:', rawTransactions);
      console.log('Raw transactions count:', rawTransactions.length);
      
      // Process transactions
      const processedTransactions = processTransactionData(rawTransactions, address);
      console.log('Processed transactions:', processedTransactions);
      
      // Group by date
      const transactionsByDate: Record<string, Transaction[]> = {};
      
      processedTransactions.forEach(tx => {
        const date = new Date(tx.timestamp).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        
        if (!transactionsByDate[date]) {
          transactionsByDate[date] = [];
        }
        
        transactionsByDate[date].push(tx);
      });
      
      // Convert to array and sort by date (newest first)
      const transactions = Object.entries(transactionsByDate)
        .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime());
      
      setTransactions(transactions);
      
      // Calculate total value
      const totalValue = processedTransactions.reduce((sum, tx) => sum + tx.usdValue, 0);
      setTotalProfitLoss(totalValue);
      
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to load transactions. Please try again later.');
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, [address, dateRange]);

  // Fetch transactions when component mounts or when address/date range changes
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Helper to format token amounts
  const formatTokenAmount = (amount: string, decimals: number = 9) => {
    try {
      // Handle negative numbers
      const isNegative = amount.startsWith('-');
      const absAmount = isNegative ? amount.substring(1) : amount;
      
      const num = BigInt(absAmount);
      const divisor = BigInt(10 ** decimals);
      const intPart = num / divisor;
      let fracPart = (num % divisor).toString().padStart(decimals, '0').replace(/0+$/, '');
      
      // Limit to 4 decimal places for display
      if (fracPart.length > 4) {
        fracPart = fracPart.substring(0, 4);
      }
      
      return `${isNegative ? '-' : ''}${intPart.toLocaleString()}${fracPart ? `.${fracPart}` : ''}`;
    } catch (e) {
      console.error('Error formatting amount:', amount, e);
      return amount;
    }
  };

  // Helper function to get token symbol from coin type
  const getTokenSymbol = (coinType: string | { name: string }): string => {
    if (!coinType) return 'TOKEN';
    
    const type = typeof coinType === 'string' ? coinType : coinType?.name || '';
    
    if (type.includes('sui::sui::SUI') || type.endsWith('::sui::SUI')) return 'SUI';
    if (type.includes('usdc::USDC') || type.endsWith('::usdc::USDC')) return 'USDC';
    if (type.includes('deep::DEEP') || type.endsWith('::deep::DEEP')) return 'DEEP';
    if (type.includes('sca::SCA') || type.endsWith('::sca::SCA')) return 'SCA';
    if (type.includes('::')) return type.split('::').pop() || 'TOKEN';
    return 'TOKEN';
  };

  // Helper to group transactions by digest
  const groupTransactions = (txs: any[]): Transaction[] => {
    const txMap = new Map<string, any>();
    
    txs.forEach(tx => {
      if (!txMap.has(tx.digest)) {
        txMap.set(tx.digest, {
          ...tx,
          transfers: []
        });
      }
      
      const existingTx = txMap.get(tx.digest);
      
      // Process coin transfers
      if (tx.effects?.events) {
        tx.effects.events.forEach((event: any) => {
          if (event.coinBalanceChange) {
            const { coinType, amount, owner } = event.coinBalanceChange;
            const isReceive = owner?.AddressOwner === address;
            const transfer: TokenTransfer = {
              amount: Math.abs(parseInt(amount)).toString(),
              token: getTokenSymbol(coinType),
              gbpValue: 0, // This would be calculated based on token price
              from: isReceive ? undefined : address,
              to: isReceive ? address : undefined
            };
            existingTx.transfers.push(transfer);
          }
        });
      }
    });
    
    // Convert to array and determine transaction type
    return Array.from(txMap.values()).map(tx => {
      const isSwap = tx.transfers.length >= 2 && 
                    tx.transfers.some((t: any) => t.amount.startsWith('-')) &&
                    tx.transfers.some((t: any) => !t.amount.startsWith('-'));
                    
      return {
        id: tx.digest,
        type: isSwap ? 'swap' : tx.transfers.length > 1 ? 'batch' : tx.transfers[0]?.to === address ? 'receive' : 'send',
        status: tx.status?.status === 'success' ? 'success' : 'failure',
        timestamp: parseInt(tx.timestampMs),
        transfers: tx.transfers,
        gbpValue: tx.transfers.reduce((sum: number, t: any) => sum + (t.gbpValue || 0), 0),
        profitLoss: 0, // This would be calculated based on cost basis
        raw: tx,
        isSwap,
        protocol: tx.transaction?.data?.packageId?.includes('bluefin') ? 'Bluefin' : 
                 tx.transaction?.data?.packageId?.includes('cetus') ? 'Cetus' :
                 tx.transaction?.data?.packageId?.includes('deepbook') ? 'DeepBook' : undefined
      };
    });
  };

  // Helper to format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper to render transaction transfers
  const renderTransfers = (transfers: TokenTransfer[]) => {
    if (!transfers || transfers.length === 0) return null;
    
    return (
      <div className="space-y-1">
        {transfers.map((transfer, idx) => {
          if (!transfer) return null;
          
          const isIncoming = transfer.to === address;
          const isNegative = transfer.amount.startsWith('-');
          const displayAmount = isNegative ? transfer.amount.substring(1) : transfer.amount;
          
          return (
            <div key={idx} className="flex justify-between items-center">
              <div className="flex items-center">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  isIncoming ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {isIncoming ? 'IN' : 'OUT'}
                </span>
                <span className="ml-2 text-sm">
                  {formatTokenAmount(displayAmount, transfer.decimals || 9)} {transfer.token}
                </span>
              </div>
              {transfer.usdValue !== undefined && transfer.usdValue > 0 && (
                <span className={`text-xs ${isIncoming ? 'text-green-600' : 'text-red-600'}`}>
                  ${transfer.usdValue.toFixed(2)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };
  
  // Helper to get transaction type label
  const getTransactionTypeLabel = (tx: Transaction) => {
    if (tx.isSwap) return 'Swap';
    if (tx.type === 'batch') return 'Batch Transfer';
    return tx.type === 'receive' ? 'Received' : 'Sent';
  };

  return (
    <div className="mt-8">
      <DateRangePicker 
        dateRange={dateRange} 
        setDateRange={setDateRange} 
        totalProfitLoss={totalProfitLoss} 
        formatCurrency={formatCurrency} 
      />
      
      {isLoading ? (
        <div className="text-center py-8">Loading transactions...</div>
      ) : error ? (
        <div className="text-center py-4 text-red-500">{error}</div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No transactions found in the selected date range
        </div>
      ) : (
        <div className="mt-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Transaction
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Value (USD)
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {transactions.map(([date, txList]) => (
                    <React.Fragment key={date}>
                      <tr className="bg-gray-50 dark:bg-gray-800">
                        <td colSpan={5} className="px-6 py-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                          {date}
                        </td>
                      </tr>
                      {txList.map((tx) => (
                        <tr 
                          key={tx.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {getTransactionTypeLabel(tx)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                              <a href={"https://suiscan.xyz/mainnet/tx/" + tx.id} target="_blank">{tx.id.substring(0, 6)}...{tx.id.substring(tx.id.length - 4)}</a>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {renderTransfers(tx.transfers)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                            ${tx.usdValue.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              tx.status === 'success' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                              {tx.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
'use client';

import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import { getDeepPriceForDate, formatTokenWithUsd, getDeepPriceForAllDates } from '@/utils/priceApi';

import { fetchAllWalletTransactions, getGasFees, processTransactionData } from '@/services/suiExplorer';
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
  status: 'success' | 'failure' | 'pending' | 'open' | 'closed';
  timestamp: number;
  transfers: TokenTransfer[];
  usdValue: number;
  profitLoss: number;
  raw?: any; // For debugging
  protocol?: string;
  isSwap?: boolean;
  // Trade specific properties
  fees?: number;
  pnl?: number;
  entryPrice?: number;
  exitPrice?: number;
  entry?: string | number;
  exit?: string | number;
  // For trade grouping
  buyTxs?: Transaction[];
  sellTxs?: Transaction[];
  transactions?: any[]; // For raw transaction data
}

export interface Trade {
  id: string;
  fees: 0,
  pnl: 0,
  buyTxs: Transaction[],
  sellTxs: Transaction[],
  status: 'closed' | 'open'
}

interface TransactionListProps {
  address: string;
}


export function TransactionList({ address }: TransactionListProps) {
  const currentYear = new Date().getFullYear();
  const [dateRange, setDateRange] = useState({
    start: new Date(2025, 8, 26), // first trade was 26th september
    end: new Date(),
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [priceCache, setPriceCache] = useState<Record<string, number | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pricesLoaded, setPricesLoaded] = useState(false);

  // Load all price data on component mount
  useEffect(() => {
    const loadPrices = async () => {
      try {
        await getDeepPriceForAllDates();
        setPricesLoaded(true);
      } catch (error) {
        console.error('Error loading price data:', error);
        // Continue even if price loading fails
        setPricesLoaded(true);
      }
    };

    loadPrices();
  }, []);

  // Update trade with USD values
  const updateTradeWithUSD = async (trade: any) => {
    if (trade.buyTxs && trade.buyTxs.length > 0) {
      const buyTx = trade.buyTxs[0];
      if (buyTx.transactions?.[0]?.timestamp) {
        const price = await getDeepPriceForDate(new Date(buyTx.transactions[0].timestamp));
        if (price) {
          trade.feesUSD = trade.fees * price;
        }
      }
    }
    return trade;
  };

  const groupTrades = (txs: any[]): Trade[] => {
    var trades = [];
    txs.forEach((tx: any) => {

      if (trades.length === 0 && tx.balanceChanges['USDC'] < 0) {
        trades.push({
          id: tx.transactions[0].id,
          fees: Math.abs(tx.balanceChanges['DEEP'] * 1) * 1,
          pnl: 0,
          buyTxs: [tx],
          sellTxs: [tx],
          status: "open"
        });
        console.log("new trade", trades);
      }
      else {
        if (tx.transactions.length > 0 && tx.transactions[0].module === "pool") {
          if (trades[trades.length - 1] !== undefined && trades[trades.length - 1].status === "open") {
            trades[trades.length - 1].buyTxs.push(tx);
            trades[trades.length - 1].status = "closed";
            trades[trades.length - 1].entry = tx.transactions[0].timestamp;
            trades[trades.length - 1].entryPrice = tx.balanceChanges['USDC'] / tx.balanceChanges['SUI'] * 1000 * -1;

            trades[trades.length - 1].fees += Math.abs(tx.balanceChanges['DEEP'] * 1) * 1;
            const deepFX = getDeepPriceForDate(new Date(tx.transactions[0].timestamp));
            console.log("currency: ", deepFX)
            if (deepFX !== null) {
              trades[trades.length - 1].feesUSD = (trades[trades.length - 1].fees * deepFX) / 1000000;
            }


            trades[trades.length - 1].sui += tx.balanceChanges['SUI'] * 1;
            trades[trades.length - 1].pnlPct = (trades[trades.length - 1].entryPrice - trades[trades.length - 1].exitPrice) / trades[trades.length - 1].entryPrice * -100;

            trades[trades.length - 1].pnl = (tx.balanceChanges['USDC'] * 1 + trades[trades.length - 1].usdc * 1) * 1 / 1000000;
            trades[trades.length - 1].usdc = tx.balanceChanges['USDC'] * 1;

          } else {
            trades.push({
              id: tx.transactions[0].id,
              exit: tx.transactions[0].timestamp,
              entry: 0,
              entryPrice: 0,
              exitPrice: tx.balanceChanges['USDC'] / tx.balanceChanges['SUI'] * 1000 * -1,
              fees: Math.abs(tx.balanceChanges['DEEP'] * 1) * 1,
              pnl: 0,
              pnlPct: 0,
              feesUSD: 0,
              sui: tx.balanceChanges['SUI'] * 1,
              usdc: tx.balanceChanges['USDC'] * 1,
              sellTxs: [tx],
              buyTxs: [],
              status: "open"
            });


          }
        } else {
          console.log('not pool', tx)
        }
      }
    });

    return trades;
  }

  // Helper to group transactions by digest
  const groupTransactions = (txs: any[]): Transaction[] => {
    let grouped = {};

    txs.forEach((tx: any) => {
      if (grouped[tx.id] === undefined) {
        grouped[tx.id] = { balanceChanges: {}, transactions: [], gas: 0 };
      }
      if (tx.module === "pool") {
        if (grouped[tx.id].balanceChanges[tx.asset] === undefined) {
          grouped[tx.id].balanceChanges[tx.asset] = 0;
        }
        if (tx.json.deposit !== undefined && tx.json.deposit === false) {
          grouped[tx.id].balanceChanges[tx.asset] += tx.amount * 1;
        }
        if (tx.json.deposit !== undefined && tx.json.deposit === true) {
          grouped[tx.id].balanceChanges[tx.asset] -= tx.amount * 1;
        }
      }
      grouped[tx.id].transactions.push(tx);
    });

    return Object.keys(grouped).map((key) => grouped[key]);

  };

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
      let processedTransactions = processTransactionData(rawTransactions, address);
      console.log('Processed transactions:', processedTransactions);
      console.log(`Number of processed transactions: ${processedTransactions.length}`)

      // Group transactions by ID using the existing groupTransactions function
      const groupedTransactions = groupTransactions(processedTransactions);

      console.log(`Number of grouped transactions: ${groupedTransactions.length}`)
      // Sort transactions by timestamp (newest first)
      const sortedTransactions = [...groupedTransactions].sort((a, b) => b.transactions[0].timestamp - a.transactions[0].timestamp);
      console.log(`Number of sorted transactions: ${sortedTransactions.length}`)

      const trades = groupTrades(sortedTransactions);
      const filteredTrades = trades.filter((trade) => trade.entry >= startTime && trade.entry <= endTime);

      console.log(`Number of trades: ${trades.length}`)

      // filter trades base on dateRange and trade.entry



      setTransactions(filteredTrades);


    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
      console.error('Error fetching transactions:', err);
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
    if (amount === "") return "";
    if (amount === "undefined") return "";
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
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${isIncoming ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
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
    if (tx.balanceChanges.USDC > 0) return "Sell";
    if (tx.balanceChanges.USDC < 0) return "Buy";



    if (tx.isSwap) return 'Swap';
    if (tx.type === 'batch') return 'Batch Transfer';
    return tx.type === 'receive' ? 'Received' : 'Sent';
  };

  const getBuyIn = (tx: Transaction) => {
    return tx.buyTxs[0].balanceChanges['USDC'] / 1000000 * -1;
  }

  return (
    <div className="mt-8">
      <DateRangePicker
        dateRange={dateRange}
        setDateRange={setDateRange}
        formatCurrency={formatCurrency}
      />

      {isLoading ? (
        <div className="text-center py-8">Loading trades...</div>
      ) : error ? (
        <div className="text-center py-4 text-red-500">{error}</div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No trades found in the selected date range
        </div>
      ) : (
        <div className="mt-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">

              <div className="justify-end mt-4" style={{ textAlign: 'left' }}>
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <tr>
                    <td>Total Trades: {transactions.length}</td>

                    <td>Winning Trades: {transactions.reduce((acc, tx) => tx.pnlPct > 0 ? acc + 1 : acc, 0).toFixed(0)} ({(transactions.reduce((acc, tx) => tx.pnlPct > 0 ? acc + 1 : acc, 0) / transactions.length * 100).toFixed(0)}%)</td>

                    <td>Average Trade:
                      <span style={{ color: transactions.reduce((acc, tx) => (tx.exitPrice) ? acc + tx.pnlPct : 0, 0) > 0 ? 'green' : 'red' }}>
                        {transactions.reduce((acc, tx) => (tx.exitPrice) ? acc + tx.pnlPct : 0, 0) > 0 ? '+' : ''}{((transactions.reduce((acc, tx) => (tx.exitPrice) ? acc + tx.pnlPct : 0, 0) / transactions.length)).toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>Total PnL: $
                      <span style={{ color: transactions.reduce((acc, tx) => (tx.exitPrice) ? acc + tx.pnl : 0, 0) > 0 ? 'green' : 'red' }}>
                        {transactions.reduce((acc, tx) => (tx.exitPrice) ? acc + tx.pnl : 0, 0).toFixed(4)}

                      </span>
                    </td>

                    <td>Trading Fees: ${transactions.reduce((acc, tx) => (tx.exitPrice) ? acc + tx.feesUSD : 0, 0).toFixed(4)}</td>

                    <td>
                      PnL - Trading Fees:
                      <span style={{ color: transactions.reduce((acc, tx) => acc + tx.pnlPct, 0) - transactions.reduce((acc, tx) => acc + tx.feesUSD, 0) > 0 ? 'green' : 'red' }}>
                        ${(transactions.reduce((acc, tx) => (tx.exitPrice) ? acc + tx.pnl : 0, 0) - transactions.reduce((acc, tx) => (tx.exitPrice) ? acc + tx.feesUSD : 0, 0)).toFixed(4)}
                      </span>
                    </td>
                  </tr>
                </table>


              </div>

              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Entry
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Entry price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Exit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Exit price
                    </th>


                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      PnL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {transactions.map((txs) => (
                    <tr
                      key={txs.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td>
                        <a href={`https://suiscan.xyz/mainnet/tx/${txs.buyTxs[0].transactions[0].id}`} target="_blank">
                          {formatDate(txs.entry)}
                        </a>
                      </td>
                      <td>
                        {txs.entryPrice.toFixed(4)}
                      </td>

                      <td>
                        {typeof txs.exit === 'number' ? (
                          <a href={`https://suiscan.xyz/mainnet/tx/${txs.sellTxs[0].transactions[0].id}`} target="_blank">
                            {formatDate(txs.exit)}
                          </a>
                        ) : ''}
                      </td>
                      <td>
                        {(txs.exitPrice) ? txs.exitPrice.toFixed(4) : ''}
                      </td>



                      <td>
                        <span style={{ color: txs.pnlPct >= 0 ? 'green' : 'red' }}>

                          {(txs.exitPrice) ? txs.pnlPct.toFixed(2) + '%' : ''}
                        </span>
                      </td>
                      <td>
                        {(txs.exitPrice) ? 'Closed' : 'Open'}

                      </td>


                    </tr>
                  ))}
                </tbody>
              </table>

            </div>
          </div>
        </div>
      )
      }
    </div >
  );
}
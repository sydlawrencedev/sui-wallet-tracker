'use client';

import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import { getDeepPriceForDate, getDeepPriceForAllDates } from '@/utils/priceApi';

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

export interface Tx {
  id: string;
  timestamp: number;
  module: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json: any;
  asset: string;
  amount: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  balanceChanges: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transactions: any[];
}

export interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'swap' | 'batch';
  status: 'success' | 'failure' | 'pending' | 'open' | 'closed';
  timestamp: number;
  transfers: TokenTransfer[];
  usdValue: number;
  profitLoss: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  buyTxs?: Tx[];
  sellTxs?: Tx[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transactions?: any[]; // For raw transaction data
}

export interface Trade {
  id: string;
  fees: number;
  pnl: number;
  buyTxs: Transaction[];
  sellTxs: Transaction[];
  status: 'closed' | 'open';
  entry: number;
  exit: number;
  entryPrice: number;
  exitPrice: number;
  feesUSD: number;
  sui: number;
  usdc: number;
  pnlPct: number;
}

interface TransactionListProps {
  address: string;
}


export function TransactionList({ address }: TransactionListProps) {
  const [dateRange, setDateRange] = useState({
    start: new Date(2025, 8, 29), // first trade was 26th september
    end: new Date(),
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load all price data on component mount
  useEffect(() => {
    const loadPrices = async () => {
      try {
        await getDeepPriceForAllDates();
      } catch (error) {
        console.error('Error loading price data:', error);
        // Continue even if price loading fails
      }
    };

    loadPrices();
  }, []);

  const groupTrades = (txs: Tx[]): Trade[] => {
    const trades: Trade[] = [];
    txs.forEach((tx: Tx) => {

      if (trades.length === 0 && tx.balanceChanges['USDC'] < 0) {
        trades.push({
          id: tx.transactions[0].id,
          fees: Math.abs(tx.balanceChanges['DEEP'] * 1),
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
  const groupTransactions = (txs: Tx[]): Transaction[] => {
    const grouped = {};

    txs.forEach((tx: Tx) => {
      if (grouped[tx.id] === undefined) {
        grouped[tx.id] = {
          balanceChanges: {},
          transactions: []
        };
      }
      if (tx.module === "pool") {
        if (grouped[tx.id].balanceChanges[tx.asset] === undefined) {
          grouped[tx.id].balanceChanges[tx.asset] = 0;
        }
        if (tx.json.deposit !== undefined && tx.json.deposit === false) {
          grouped[tx.id].balanceChanges[tx.asset] += Number(tx.amount);
        }
        if (tx.json.deposit !== undefined && tx.json.deposit === true) {
          grouped[tx.id].balanceChanges[tx.asset] -= Number(tx.amount);
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
      const processedTransactions = processTransactionData(rawTransactions, address);
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

    }
  }, [address, dateRange]);

  // Fetch transactions when component mounts or when address/date range changes
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Helper to format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="mt-8">
      <DateRangePicker
        dateRange={dateRange}
        setDateRange={setDateRange}
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
                    <td>Total Trading volume: ${Math.round(transactions.reduce((acc, tx) => (tx.usdc) ? acc + tx.usdc * -1 : acc, 0) / 1000000 * 2).toLocaleString()}</td>

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
                      <span style={{ color: transactions.reduce((acc, tx) => acc + tx.pnl, 0) - transactions.reduce((acc, tx) => acc + tx.feesUSD, 0) > 0 ? 'green' : 'red' }}>
                        ${(transactions.reduce((acc, tx) => (tx.exitPrice) ? acc + tx.pnl : 0, 0) - transactions.reduce((acc, tx) => (tx.exitPrice) ? acc + tx.feesUSD : 0, 0)).toFixed(4)}
                      </span>
                    </td>

                    <td>
                      Compounded:
                      <span style={{ color: transactions.reduce((acc, tx) => acc + tx.pnl, 0) - transactions.reduce((acc, tx) => acc + tx.feesUSD, 0) > 0 ? 'green' : 'red' }}>
                        {(transactions.reverse().reduce((acc, tx) => (tx.exitPrice) ? acc * (1 + tx.pnlPct / 100) : acc, 1)).toFixed(2)}%
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
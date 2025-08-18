'use client';

import { format } from 'date-fns';
import { useState, useEffect, useCallback } from 'react';
import { fetchAllWalletTransactions, processTransactionData } from '@/services/suiExplorer';

export interface Transaction {
  id: string;
  type: 'send' | 'receive';
  status: 'success' | 'failure' | 'pending';
  amount: string;
  token: 'SUI' | 'USDC';
  gbpValue: number;
  profitLoss: number;
  timestamp: number;
  from?: string;
  to?: string;
  raw?: any; // For debugging
}

interface TransactionListProps {
  address: string;
}

// DateRangePicker component for selecting date ranges
const DateRangePicker = ({ 
  dateRange, 
  setDateRange, 
  totalProfitLoss, 
  formatCurrency 
}: {
  dateRange: { start: Date, end: Date },
  setDateRange: (range: { start: Date, end: Date }) => void,
  totalProfitLoss: number,
  formatCurrency: (value: number) => string
}) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '1.5rem'
  }}>
    <div style={{ flex: 1 }}>
      <h2 style={{
        fontSize: '1.25rem',
        fontWeight: 600,
        color: 'var(--text-color)',
        margin: 0
      }}>
        Transaction History
        {totalProfitLoss !== 0 && (
          <span style={{
            marginLeft: '0.75rem',
            fontSize: '0.875rem',
            color: totalProfitLoss >= 0 ? 'var(--success-color)' : 'var(--danger-color)',
            fontWeight: 500
          }}>
            {totalProfitLoss > 0 ? '↑' : '↓'} {formatCurrency(Math.abs(totalProfitLoss))} total
          </span>
        )}
      </h2>
    </div>
    
    <div style={{ width: '100%' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        backgroundColor: 'var(--card-bg)',
        padding: '0.5rem',
        borderRadius: '0.5rem',
        border: '1px solid var(--border-color)',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="date"
            value={dateRange.start.toISOString().split('T')[0]}
            onChange={(e) => setDateRange({ ...dateRange, start: new Date(e.target.value) })}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.375rem',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--card-bg)',
              color: 'var(--text-color)',
              fontSize: '0.875rem',
              lineHeight: '1.25rem'
            }}
            max={dateRange.end.toISOString().split('T')[0]}
          />
        </div>
        <span style={{ color: 'var(--text-light)', fontSize: '0.875rem' }}>to</span>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="date"
            value={dateRange.end.toISOString().split('T')[0]}
            onChange={(e) => setDateRange({ ...dateRange, end: new Date(e.target.value) })}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.375rem',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--card-bg)',
              color: 'var(--text-color)',
              fontSize: '0.875rem',
              lineHeight: '1.25rem'
            }}
            min={dateRange.start.toISOString().split('T')[0]}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
      </div>
    </div>
  </div>
);

export function TransactionList({ address }: TransactionListProps) {
  const currentYear = new Date().getFullYear();
  const [dateRange, setDateRange] = useState({
    start: new Date(currentYear, 0, 1), // January 1st of current year
    end: new Date(),
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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
      
      // Process the raw transaction data into a more usable format
      const processedTransactions = processTransactionData(rawTransactions, address);
      console.log('Processed transactions:', processedTransactions);
      
      // Ensure all transactions have the required fields with proper types
      const typedTransactions: Transaction[] = processedTransactions.map(tx => ({
        id: tx.id || '',
        type: tx.type === 'send' ? 'send' : 'receive',
        status: tx.status === 'success' ? 'success' : tx.status === 'pending' ? 'pending' : 'failure',
        amount: tx.amount || '0',
        token: tx.token === 'USDC' ? 'USDC' : 'SUI',
        gbpValue: typeof tx.gbpValue === 'number' ? tx.gbpValue : 0,
        profitLoss: typeof tx.profitLoss === 'number' ? tx.profitLoss : 0,
        timestamp: typeof tx.timestamp === 'number' ? tx.timestamp : 0,
        from: tx.from,
        to: tx.to,
        raw: tx.raw
      }));
      
      // Calculate total profit/loss (this is simplified - in a real app, you'd need to track cost basis)
      const totalPL = typedTransactions.reduce((sum, tx) => sum + (tx.profitLoss || 0), 0);
      
      setTransactions(typedTransactions);
      setTotalProfitLoss(totalPL);
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
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div style={{ marginTop: '2rem' }}>
      <DateRangePicker 
        dateRange={dateRange} 
        setDateRange={setDateRange} 
        totalProfitLoss={totalProfitLoss} 
        formatCurrency={formatCurrency} 
      />
      
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>Loading transactions...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--danger-color)' }}>{error}</div>
      ) : transactions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-light)' }}>
          No transactions found in the selected date range
        </div>
      ) : (
        <div>
          <div style={{
            backgroundColor: 'var(--card-bg)', 
            borderRadius: '0.5rem',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                minWidth: '600px'
              }}>
                <thead>
                  <tr style={{ 
                    backgroundColor: 'var(--bg-color)',
                    textAlign: 'left'
                  }}>
                    <th style={{ 
                      padding: '0.75rem 1.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'var(--text-light)'
                    }}>Date</th>
                    <th style={{ 
                      padding: '0.75rem 1.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'var(--text-light)'
                    }}>Transaction</th>
                    <th style={{ 
                      padding: '0.75rem 1.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'var(--text-light)',
                      textAlign: 'right'
                    }}>Amount</th>
                    <th style={{ 
                      padding: '0.75rem 1.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'var(--text-light)',
                      textAlign: 'right'
                    }}>Value (GBP)</th>
                    <th style={{ 
                      padding: '0.75rem 1.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'var(--text-light)',
                      textAlign: 'right'
                    }}>P/L</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr 
                      key={tx.id}
                      style={{
                        borderTop: '1px solid var(--border-color)',
                        transition: 'background-color 0.2s',
                      }}
                      className="hover-row"
                    >
                      <td style={{ 
                        padding: '1rem 1.5rem',
                        fontSize: '0.875rem',
                        color: 'var(--text-color)'
                      }}>
                        {format(new Date(tx.timestamp), 'dd MMM yyyy')}
                        <div style={{ 
                          fontSize: '0.75rem', 
                          color: 'var(--text-light)',
                          marginTop: '0.25rem'
                        }}>
                          {format(new Date(tx.timestamp), 'HH:mm:ss')}
                        </div>
                      </td>
                      <td style={{ 
                        padding: '1rem 1.5rem',
                        fontSize: '0.875rem',
                        color: 'var(--text-color)'
                      }}>
                        <div style={{ 
                          fontWeight: '500',
                          marginBottom: '0.25rem'
                        }}>
                          {tx.type === 'send' ? 'Sent' : 'Received'} {tx.token}
                        </div>
                        {tx.type === 'send' && tx.to && (
                          <div style={{ 
                            fontSize: '0.75rem', 
                            color: 'var(--text-light)',
                            fontFamily: 'monospace'
                          }}>
                            To: {tx.to.substring(0, 6)}...{tx.to.substring(tx.to.length - 4)}
                          </div>
                        )}
                        {tx.type === 'receive' && tx.from && (
                          <div style={{ 
                            fontSize: '0.75rem', 
                            color: 'var(--text-light)',
                            fontFamily: 'monospace'
                          }}>
                            From: {tx.from.substring(0, 6)}...{tx.from.substring(tx.from.length - 4)}
                          </div>
                        )}
                      </td>
                      <td style={{ 
                        padding: '1rem 1.5rem',
                        fontSize: '0.875rem',
                        textAlign: 'right',
                        fontFamily: 'monospace',
                        color: tx.type === 'receive' ? 'var(--success-color)' : 'var(--text-color)'
                      }}>
                        {tx.type === 'receive' ? '+' : '-'} {tx.amount} {tx.token}
                      </td>
                      <td style={{ 
                        padding: '1rem 1.5rem',
                        fontSize: '0.875rem',
                        textAlign: 'right',
                        color: 'var(--text-color)'
                      }}>
                        {formatCurrency(tx.gbpValue)}
                      </td>
                      <td style={{ 
                        padding: '1rem 1.5rem',
                        fontSize: '0.875rem',
                        textAlign: 'right',
                        color: tx.profitLoss >= 0 ? 'var(--success-color)' : 'var(--danger-color)',
                        fontWeight: '500'
                      }}>
                        {tx.profitLoss > 0 ? '+' : ''}{formatCurrency(tx.profitLoss)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <style jsx>{`
            .hover-row:hover {
              background-color: var(--hover-bg);
            }
            
            @media (max-width: 768px) {
              table {
                display: block;
              }
              
              tbody {
                display: block;
              }
              
              tr {
                display: grid;
                grid-template-columns: 1fr 1fr;
                grid-template-areas: 
                  "date amount"
                  "details details";
                padding: 1rem;
              }
              
              td, th {
                padding: 0.5rem 0 !important;
                border: none !important;
              }
              
              td:first-child, th:first-child {
                grid-area: date;
                text-align: left !important;
              }
              
              td:nth-child(2), th:nth-child(2) {
                grid-area: details;
                padding-top: 0.5rem !important;
              }
              
              td:last-child, th:last-child {
                grid-area: amount;
                text-align: right !important;
              }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
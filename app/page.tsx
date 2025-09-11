'use client';

import { WalletInfo } from '@/components/WalletInfo';
import { TransactionList } from '@/components/TransactionList';

// Hardcoded SUI wallet address for demonstration
const DEFAULT_SUI_ADDRESS = process.env.NEXT_PUBLIC_DEFAULT_SUI_ADDRESS || '';

export default function Home() {
  return (
    <main style={{ 
      maxWidth: '90rem', 
      margin: '0 auto',
      padding: '2rem 1rem'
    }}>
      <div style={{ 
        maxWidth: '80rem', 
        margin: '0 auto'
      }}>
        <h1 style={{ 
          fontSize: '2.25rem', 
          fontWeight: 'bold', 
          marginBottom: '2rem',
          color: 'var(--text-color)'
        }}>
          SUI Wallet Tracker
        </h1>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '2rem',
        }}>
          <img src="/backtests/strategy_chart-SUI-USD-h3ka.png" alt="Strategy Chart" width="100%"/>
          <div>
            <WalletInfo address={DEFAULT_SUI_ADDRESS} />
          </div>
          <div>
            <TransactionList address={DEFAULT_SUI_ADDRESS} />
          </div>
        </div>
      </div>
    </main>
  );
}

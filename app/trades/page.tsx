'use client';

import { TransactionList } from '@/components/TransactionList';
import { useSearchParams } from 'next/navigation';

export default function TradesPage() {
  const searchParams = useSearchParams();
  const address = searchParams.get('address') || process.env.NEXT_PUBLIC_DEFAULT_SUI_ADDRESS || '';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Trade History</h1>
        <p className="text-gray-400">View all trades for AT1000i</p>
      </div>

      {address ? (
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 shadow-lg">
          <TransactionList address={address} />
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl p-6 border border-red-500 border-opacity-50 text-center">
          <p className="text-red-400">No wallet address provided. Please provide a wallet address.</p>
        </div>
      )}
    </div>
  );
}

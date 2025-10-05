import { Suspense } from 'react';
import TradesContent from './TradesContent';

export default function TradesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Trade History</h1>
        <p className="text-gray-400">View all trades for AT1000i</p>
      </div>

      <Suspense fallback={<div className="text-white p-4">Loading trades...</div>}>
        <TradesContent />
      </Suspense>
    </div>
  );
}

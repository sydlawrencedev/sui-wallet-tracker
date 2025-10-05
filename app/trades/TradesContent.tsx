'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { TransactionList } from '@/components/TransactionList';

function TradesContent() {
    const searchParams = useSearchParams();
    const address = searchParams.get('address') || process.env.NEXT_PUBLIC_DEFAULT_SUI_ADDRESS || '';

    return (
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 shadow-lg">
            <TransactionList address={address} />
        </div>
    );
}

export default function TradesContentWrapper() {
    return (
        <Suspense fallback={<div className="text-white p-4">Loading trades...</div>}>
            <TradesContent />
        </Suspense>
    );
}

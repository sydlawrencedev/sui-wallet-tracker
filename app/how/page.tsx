'use client';

import Link from 'next/link';
import HowToInvest from './HowToInvest';

export default function HowItWorks() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 to-gray-900 text-gray-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <div className="mb-6 -mt-2">
          <Link 
            href="/" 
            className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors text-xs"
          >
            <span className="mr-1">←</span>
            Back
          </Link>
        </div>

        {/* Header */}
        <header className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400 mb-4">
            How to Invest in AT1000i
          </h1>
        </header>

        {/* Content */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 border border-gray-800 shadow-xl">
          <HowToInvest />
        </div>
      </div>
    </main>
  );
}

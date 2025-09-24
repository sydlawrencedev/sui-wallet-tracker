import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Navbar } from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SUI AT1000i',
  description: 'Track SUI wallet transactions with GBP values and profit/loss',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <Providers>
          <div className="min-h-screen bg-gray-950 text-gray-100">
            <Navbar />
            <main className="pt-4">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}

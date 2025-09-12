import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'SUI Auto Trader 2000',
  description: 'Track SUI wallet transactions with GBP values and profit/loss',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div style={{ minHeight: '100vh' }}>
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}

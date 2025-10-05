import { NextResponse, NextRequest } from 'next/server';
import { getServerSideWalletData } from '@/lib/walletData';
import { getCachedPrice, updateCache, getDefaultPriceData, type PriceData } from '@/lib/priceCache';

export const dynamic = 'force-dynamic'; // Ensure fresh data on each request


export async function GET(
  request: NextRequest,
) {
  const pathname = request.nextUrl.pathname;
  const address = pathname.split('/').pop();

  if (!address) {
    return NextResponse.json(
      { error: 'Wallet address is required' },
      { status: 400 }
    );
  }

  try {
    const data = await getServerSideWalletData(address);

    // Helper to get today's date in YYYY-MM-DD format
    function getTodayDateString(): string {
      return new Date().toISOString().split('T')[0];
    }

    const today = getTodayDateString();
    const cachedData = getCachedPrice(today) || getDefaultPriceData({ date: today });

    data.tokens.forEach((token) => {
      if (token.symbol === "AT1000i" && address === process.env.NEXT_PUBLIC_DEFAULT_SUI_ADDRESS) {
        // Only update if the price has changed significantly (more than 0.1%)
        const updatedData: PriceData = {
          ...cachedData,
          "TOKENS_AVAILABLE": token.balance / 1000000000,
          date: today,
          timestamp: new Date().getTime()
        };

        // Don't await this to avoid blocking the response
        updateCache(updatedData).catch(error => {
          console.error('Background cache update failed:', error);
        });
      }
      if (token.symbol === "DEEP" && address === process.env.NEXT_PUBLIC_DEFAULT_SUI_ADDRESS) {
        // Only update if the price has changed significantly (more than 0.1%)
        const updatedData: PriceData = {
          ...cachedData,
          "DEEP": token.priceUSD,
          date: today,
          timestamp: new Date().getTime()
        };

        // Don't await this to avoid blocking the response
        updateCache(updatedData).catch(error => {
          console.error('Background cache update failed:', error);
        });
      }
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in wallet API route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet data' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { getServerSideWalletData } from '@/lib/walletData';
import { getCachedPrice, updateCache, getDefaultPriceData, type PriceData } from '@/lib/priceCache';


export const dynamic = 'force-dynamic'; // Ensure fresh data on each request

export async function GET(
  request: Request,
  { params }: { params: { address: string } }
) {
  // Ensure params is resolved before accessing its properties
  const resolvedParams = await Promise.resolve(params);
  const address = resolvedParams.address;

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
      if (token.symbol === "AT1000i" && address === "0xbcae8fa928ed6606f78c8d0aead213d6e76d29041337dff3b9448e953e79fb39") {
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

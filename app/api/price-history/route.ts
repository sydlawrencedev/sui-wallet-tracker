import { NextResponse } from 'next/server';
import { getAllCachedPrices } from '@/lib/priceCache';

export async function GET() {
  try {
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];

    // Try to get cached data first
    const cachedData = getAllCachedPrices();

    // If we have recent cached data (from today), return it
    const todayData = cachedData.find(item => item.date === dateString);
    if (todayData) {
      return NextResponse.json({ data: cachedData });
    }

    // Return all cached data (including the newly added)
    const updatedCache = getAllCachedPrices();
    return NextResponse.json({ data: updatedCache });

  } catch (error) {
    console.error('Error in price history API:', error);

    // If there's an error but we have cached data, return that
    const cachedData = getAllCachedPrices();
    if (cachedData.length > 0) {
      return NextResponse.json({
        data: cachedData,
        error: 'Using cached data due to API error'
      });
    }

    return NextResponse.json(
      { error: 'Failed to fetch price history' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { getServerSideWalletData } from '@/lib/walletData';

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
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in wallet API route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet data' },
      { status: 500 }
    );
  }
}

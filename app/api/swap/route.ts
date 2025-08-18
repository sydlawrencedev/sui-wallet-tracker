import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { DeepBookClient } from '@mysten/deepbook';
import { NextResponse } from 'next/server';

// This is the coin type for bridged USDC (wormhole) on Sui Mainnet.
const USDC_TYPE = '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d2177a942::coin::COIN';

export async function POST(request: Request) {
  const { address, amount } = await request.json();
  const privateKey = process.env.SUI_PRIVATE_KEY;

  if (!privateKey) {
    return NextResponse.json({ error: 'SUI_PRIVATE_KEY is not set on the server.' }, { status: 500 });
  }

  try {
    const client = new SuiClient({ url: 'https://fullnode.mainnet.sui.io:443' });
    const keypair = Ed25519Keypair.fromSecretKey(Buffer.from(privateKey, 'hex'));
    const deepbook = new DeepBookClient(client);
    const usdcBalance = BigInt(amount);

    const txb = new Transaction();

    // Find the USDC coin objects to use for the swap
    const coins = await client.getCoins({ owner: address, coinType: USDC_TYPE });
    if (coins.data.length === 0) {
      return NextResponse.json({ error: 'No USDC coins found to swap.' }, { status: 400 });
    }

    const [primaryCoin, ...mergeCoins] = coins.data.map((coin) => coin.coinObjectId);
    const quoteCoin = txb.object(primaryCoin);
    if (mergeCoins.length > 0) {
      txb.mergeCoins(quoteCoin, mergeCoins.map((coin) => txb.object(coin)));
    }

    const [baseOut, quoteOut] = await deepbook.swapExactQuoteForBase(
      '0x532523982f813a36f25e4585e8037061f21e2c7c51a00a1b5d1e6f1a4e1511f5', // SUI-USDC pool ID
      quoteCoin,
      usdcBalance,
      txb
    );

    txb.transferObjects([baseOut, quoteOut], address);

    const result = await client.signAndExecuteTransaction({ 
      signer: keypair, 
      transaction: txb 
    });

    return NextResponse.json({ digest: result.digest });
  } catch (err) {
    console.error('Swap failed:', err);
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Swap failed.', details: errorMessage }, { status: 500 });
  }
}

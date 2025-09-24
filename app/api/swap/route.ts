// Import required Sui SDK modules
import { Transaction } from "@mysten/sui/transactions";
import { SuiClient } from "@mysten/sui/client";
import { DeepBookClient } from "@mysten/deepbook-v3";
import { bcs } from "@mysten/sui/bcs";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { NextResponse } from "next/server";

const SLIPPAGE = 0.01;
const MINIMUM_SUI_LEFT_IN_WALLET = 2

// Initialize wallet from private key
const SUI_PRIVATE_KEY = process.env.SUI_PRIVATE_KEY;
if (!SUI_PRIVATE_KEY) {
    throw new Error('SUI_PRIVATE_KEY is not set in .env file');
}

const keypair = Ed25519Keypair.fromSecretKey(Uint8Array.from(Buffer.from(SUI_PRIVATE_KEY, 'hex')));

// Constants for DeepBook protocol on Sui mainnet
const DEEPBOOK_PACKAGE_ID = "0x2c8d603bc51326b8c13cef9dd07031a408a48dddb541963357661df5d3204809"
const SUI_COIN_TYPE = "0x2::sui::SUI"
const USDC_COIN_TYPE = "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC"
const REGISTRY_ID = "0xaf16199a2dff736e9f07a845f23c5da6df6f756eddb631aed9d24a93efc4549d"

// Sui network URL
type Environment = 'mainnet' | 'testnet';
const SUI_ENV: Environment = (process.env.SUI_ENV === 'testnet' ? 'testnet' : 'mainnet');
const SUI_NETWORK = `https://fullnode.${SUI_ENV}.sui.io:443`;

// Initialize Sui client connected to specified network
const client = new SuiClient({
    url: SUI_NETWORK
});

// Initialize DeepBook client with proper configuration
const deepbookClient = new DeepBookClient({
    client: client as any,
    address: REGISTRY_ID,
    env: SUI_ENV
});

// Function to get pool ID for a specific asset pair
async function getPoolId(
  PACKAGE: string,
  COIN1: string,
  COIN2: string,
  REGISTRY: string
): Promise<string> {
     // Create a new transaction to interact with DeepBook
    const get_pool_tx = new Transaction()

    // Prepare the Move call to get pool ID for SUI/USDC pair
    get_pool_tx.moveCall({
        package: PACKAGE,  // DeepBook package ID
        module: "pool",                // Module containing pool operations
        function: "get_pool_id_by_asset",  // Function to get pool ID
        typeArguments: [
            COIN1,    // Base asset
            COIN2    // Quote asset
        ],
        arguments: [
            get_pool_tx.object(REGISTRY)  // Registry ID for the pool
        ]
    })

    // Execute the transaction in dev mode to get the pool ID
    const result = await client.devInspectTransactionBlock({
        sender: DEEPBOOK_PACKAGE_ID,
        transactionBlock: get_pool_tx
    });

    // Check if the transaction was successful
    if (!result?.results?.[0]?.returnValues?.[0]?.[0]) {
        throw new Error('Failed to get pool ID from devInspectTransactionBlock');
    }

    // Parse the pool ID from the bytes returned by devInspectTransactionBlock
    const pool_id = bcs.Address.parse(new Uint8Array(
        result.results[0].returnValues[0][0]
    ))

    return pool_id;
}

// Function to get the mid price of a specific asset pair
async function getPrice(
    pool_id: string,
    package_id: string,
    coin1: string,
    coin2: string
): Promise<BigInt> {
    const tx = new Transaction()

    // Prepare the Move call to get the mid price
    tx.moveCall({
        package: package_id,
        module: "pool",
        function: "mid_price",
        typeArguments: [
            coin1,
            coin2
        ],
        arguments: [
            tx.object(pool_id),
            tx.object.clock()
        ]
    })

    // Execute the transaction in dev mode to get the mid price
    const mid_price_bytes = (await client.devInspectTransactionBlock({
        sender: keypair.getPublicKey().toSuiAddress(), // Any address is fine
        transactionBlock: tx
    }))

    if (!mid_price_bytes?.results?.[0]?.returnValues?.[0]?.[0]) {
        throw new Error('Failed to get mid price bytes from devInspectTransactionBlock');
    }

    // Parse the mid price from the bytes returned by devInspectTransactionBlock
    // The returned bytes are a U64, so we need to parse it as such
    const mid_price = BigInt(bcs.u64().parse(new Uint8Array(
        mid_price_bytes.results[0].returnValues[0][0]
    )))

    return mid_price
}

async function transact(
    tx: Transaction,
    baseOut: any,
    quoteOut: any,
    deepOut: any
): Promise<boolean | any> {
    try {
        tx.transferObjects([baseOut, quoteOut, deepOut], keypair.getPublicKey().toSuiAddress());

        // Set the sender
        tx.setSender(keypair.getPublicKey().toSuiAddress());

        console.log('Building and executing transaction...');
        
        // Sign and execute the transaction
        const result = await client.signAndExecuteTransaction({
            transaction: tx,
            signer: keypair,
            options: {
                showEffects: true,
                showEvents: true,
            },
        });

        if (result.effects?.status?.status === 'success') {
            console.log('✅ Swap executed successfully!');
            return result;
        } else {
            console.error('❌ Swap failed:', result.effects?.status?.error);
            return result;
        }

        // No explicit return needed as the function is declared to return void
    } catch (error) {
        console.error('❌ Error executing swap:');
        if (error instanceof Error) {
            console.error(error.message);
            if (error.stack) {
                console.error(error.stack);
            }
        } else {
            console.error(error);
        }
        throw error;
    }
}

async function swapUSDCForSUI(
    amount: number = 1, // Default to 1 USDC
    minOut: number = 0.01 // Default to 0.1 SUI
): Promise<void> {
    try {

        console.log("Swapping " + amount + " USDC for SUI")

        // Create a new transaction
        const tx = new Transaction();
        
        // what can I do here, instead of swap? can I place an order?
        const [baseOut, quoteOut, deepOut] = deepbookClient.deepBook.swapExactQuoteForBase({
            poolKey: 'SUI_USDC',
            amount: amount, // amount of SUI to swap
            deepAmount: 1, // amount of DEEP to pay as fees, excess is returned
            minOut: minOut, // minimum amount of USDC to receive or transaction fails
        })(tx as any);

        var success = await transact(tx, baseOut, quoteOut, deepOut);
        return success;
        // No explicit return needed as the function is declared to return void
    } catch (error) {
        console.error('❌ Error executing swap:');
    }
}

async function swapSUIForUSDC(
    amount: number = 1, // Default to 1 SUI (1 SUI = 1_000_000 MIST)
    minOut: number = 0.1 // Default to 0.1 USDC
): Promise<void> {
    try {
        console.log("Swapping " + amount + " SUI for USDC")
        // Create a new transaction
        const tx = new Transaction();

        const [baseOut, quoteOut, deepOut] = deepbookClient.deepBook.swapExactBaseForQuote({
            poolKey: 'SUI_USDC',
            amount: amount, // amount of SUI to swap
            deepAmount: 1, // amount of DEEP to pay as fees, excess is returned
            minOut: minOut, // minimum amount of USDC to receive or transaction fails
        })(tx as any);

        var success = await transact(tx, baseOut, quoteOut, deepOut);
       return success;
        // No explicit return needed as the function is declared to return void
    } catch (error) {
        console.error('❌ Error executing swap:');
    }
}

export async function POST(request: Request, { params }: { params: { token: string } }) {

  if (!SUI_PRIVATE_KEY) {
    return NextResponse.json({ error: 'SUI_PRIVATE_KEY is not set on the server.' }, { status: 500 });
  }

  try {
    
    const { amount, token } = await request.json();
    if (token == "USDC") {
      // Get the USDC coin to swap
      const balance = await client.getBalance({
        owner: keypair.toSuiAddress(),
        coinType: USDC_COIN_TYPE,
      });
      
      const amountIn = Number(balance.totalBalance) / 1000000   
      
      if (amountIn < 5) {
        console.log("not enough USDC " + amountIn);
        return NextResponse.json({ error: 'No USDC found in wallet' }, { status: 400 });
      }
      
      // const swap_result = await swapSUIForUSDC(1, 0.1);
      const result = await swapUSDCForSUI(Number(amountIn), 0.1) as any;

      return NextResponse.json({ 
        success: true,
        digest: result.digest,
        events: result.events,
        effects: result.effects
      });
    }

    if (token == "SUI") {
      // Get the USDC coin to swap
      const balance = await client.getBalance({
        owner: keypair.toSuiAddress(),
        coinType: SUI_COIN_TYPE,
      });

      const amountIn = Number(balance.totalBalance) / 1000000000 - MINIMUM_SUI_LEFT_IN_WALLET  
      
      if (amountIn < 2) {
        console.log("not enough SUI");
        return NextResponse.json({ error: 'No SUI found in wallet' }, { status: 400 });
      }
      
      // const swap_result = await swapSUIForUSDC(1, 0.1);
      const result = await swapSUIForUSDC(Number(amountIn), 0.1) as any;

      return NextResponse.json({ 
        success: true,
        digest: result.digest,
        events: result.events,
        effects: result.effects
      });
    }
    
  } catch (error) {
    console.error('Swap error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute swap' },
    );
  }
}

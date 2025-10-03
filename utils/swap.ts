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
            console.error(result);
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

export async function swap(token: string, amount: number) {

    if (!SUI_PRIVATE_KEY) {
        return { error: 'SUI_PRIVATE_KEY is not set on the server.' }
    }

    try {

        if (token == "USDC") {
            // Get the USDC coin to swap
            const balance = await client.getBalance({
                owner: keypair.toSuiAddress(),
                coinType: USDC_COIN_TYPE,
            });

            const amountIn = Number(balance.totalBalance) / 1000000

            if (amountIn < 5) {
                console.log("not enough USDC " + amountIn);
                return { error: 'No USDC found in wallet' }
            }

            // const swap_result = await swapSUIForUSDC(1, 0.1);
            const result = await swapUSDCForSUI(Number(amountIn), 0.1) as any;

            return {
                success: true,
                digest: result.digest,
                events: result.events,
                effects: result.effects
            };
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
                return { error: 'No SUI found in wallet' }
            }

            // const swap_result = await swapSUIForUSDC(1, 0.1);
            const result = await swapSUIForUSDC(Number(amountIn), 0.1) as any;

            return {
                success: true,
                digest: result.digest,
                events: result.events,
                effects: result.effects
            };
        }

    } catch (error) {
        console.error('Swap error:', error);
        return { error: error instanceof Error ? error.message : 'Failed to execute swap' }
    }
}

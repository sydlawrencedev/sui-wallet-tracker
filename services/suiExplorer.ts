interface SuiTransaction {
  digest: string;
  timestampMs: string;
  json: any;
  data: any;
  raw: any;
  success: boolean;
  rawEvent?: {
    id: {
      txDigest: string;
      eventSeq: string;
    };
    packageId: string;
    transactionModule: string;
    sender: string;
    type: string;
    parsedJson: any;
    bcs: string;
    timestampMs?: string;
  };
  gasUsed: {
    computationCost: string;
    storageCost: string;
    storageRebate: string;
  };
  transaction: {
    data: {
      messageVersion: string;
      transaction: {
        kind: string;
        data: any;
      };
      sender: string;
      gasData: {
        payment: Array<{
          objectId: string;
          version: number;
          digest: string;
        }>;
        owner: string;
        price: string;
        budget: string;
      };
    };
  };
  effects: {
    status: {
      status: string;
    };
    gasUsed: {
      computationCost: string;
      storageCost: string;
      storageRebate: string;
    };
    modifiedAtVersions: Array<{
      objectId: string;
      sequenceNumber: string;
    }>;
    transactionDigest: string;
    created: Array<{
      owner: {
        AddressOwner?: string;
        ObjectOwner?: string;
      };
      reference: {
        objectId: string;
        version: number;
        digest: string;
      };
    }>;
    mutated: Array<{
      owner: {
        AddressOwner?: string;
        ObjectOwner?: string;
      };
      reference: {
        objectId: string;
        version: number;
        digest: string;
      };
    }>;
    deleted: Array<{
      objectId: string;
      version: number;
      digest: string;
    }>;
    gasObject: {
      owner: string;
      reference: {
        objectId: string;
        version: number;
        digest: string;
      };
    };
    eventsDigest: string;
    dependencies: string[];
  };
  events: Array<{
    id: {
      txDigest: string;
      eventSeq: string;
    };
    packageId: string;
    transactionModule: string;
    sender: string;
    type: string;
    parsedJson: any;
    bcs: string;
    timestampMs: string;
  }>;
  objectChanges: Array<{
    type: string;
    sender: string;
    owner: {
      AddressOwner: string;
    };
    objectType: string;
    objectId: string;
    version: number;
    digest: string;
  }>;
  balanceChanges: Array<{
    owner: {
      AddressOwner: string;
    };
    coinType: string;
    amount: string;
  }>;
}

export async function getGasFees(
  txDigest: string,
  cb: Function,
): Promise<{ data: SuiTransaction[]; nextCursor: string | null }> {
  console.log('Fetching transaction fees for address:', txDigest);
  const query = {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "sui_getTransactionBlock",
    "params": [
      {
        "digest": txDigest
      }
    ]
  };

  try {
    const response = await fetch('https://fullnode.mainnet.sui.io:443', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(query),
    });


    if (!response.ok) {
      throw new Error(`Failed to fetch transactions: ${response.statusText}`);
    } else {
      const responseData = await response.json();

      cb(responseData);
    }
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return cb({ data: [], nextCursor: null });
  }
}

export async function fetchWalletTransactions(
  address: string,
  cursor: string | null = null,
  limit: number = 10
): Promise<{ data: SuiTransaction[]; nextCursor: string | null }> {
  console.log('Fetching transactions for address:', address);
  const query = {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "suix_queryEvents",
    "params": [
      {
        "Sender": address
      },
      cursor,
      limit,
      false
    ]
  };

  try {
    const response = await fetch('https://fullnode.mainnet.sui.io:443', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(query),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch transactions: ${response.statusText}`);
    }

    const responseData = await response.json();

    if (responseData.error) {
      console.error('API Error:', responseData.error);
      return { data: [], nextCursor: null };
    }

    // The response data could be in different formats depending on the RPC method
    let transactions: any[] = [];
    let nextCursor: string | null = null;

    if (responseData.result?.data) {
      // If we have a result.data array, use that
      transactions = responseData.result.data;
      nextCursor = responseData.result.nextCursor || null;
    } else if (Array.isArray(responseData.result)) {
      // If the result is directly an array
      transactions = responseData.result;
    } else if (responseData.result) {
      // If we have a single result object
      transactions = [responseData.result];
    }

    console.log(`Found ${transactions.length} transactions in the response`);

    // Process each transaction
    const activities = transactions.map((tx: any) => {
      // Handle different response formats
      const event = tx.rawEvent || tx.raw || tx;
      const timestampMs = tx.timestampMs || event.timestampMs || Date.now().toString();
      // Create a base transaction object with required fields
      const baseTx: any = {
        digest: tx.digest || event.id?.txDigest || 'unknown',
        timestampMs: timestampMs.toString(),

        // Include the raw event data
        rawEvent: event,
        raw: tx,
      };
      return baseTx;
    });

    console.log(`Processed ${activities.length} transactions`);

    return {
      data: activities,
      nextCursor: nextCursor
    };
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return { data: [], nextCursor: null };
  }
}

import { convertToGBP } from './exchangeRates';

export interface TokenBalance {
  symbol: string;
  balance: string;
  decimals: number;
  priceUSD: number;
  priceGBP: number;
  valueUSD: number;
  valueGBP: number;
  profitLoss: number;
  priceChange24h: number;
  coinType: string;
  lastUpdated: string;
}

// Cache for token prices to avoid redundant API calls
const tokenPriceCache: Record<string, { priceUSD: number; timestamp: number }> = {};
const PRICE_CACHE_DURATION_MS = 1 * 60 * 1000; // 5 minutes

// Default prices to use when API is rate limited or no cache is available
const DEFAULT_PRICES: Record<string, number> = {
  SUI: 3.6203,   // Example default price
  USDC: 1.0,  // USDC is pegged to $1
  DEEP: 0.1365   // Example default price
};

// Track rate limit status
let rateLimitResetTime = 0;

// Helper function to get cached price if valid
function getCachedPrice(token: string): number | null {
  const cached = tokenPriceCache[token];
  if (cached && (Date.now() - cached.timestamp < PRICE_CACHE_DURATION_MS)) {
    return cached.priceUSD;
  }
  return null;
}

// Normalize token symbol for consistent cache lookups
function normalizeTokenSymbol(token: string): string {
  return token.toUpperCase();
}

async function getTokenPrice(token: string): Promise<number> {
  const normalizedToken = normalizeTokenSymbol(token);
  const now = Date.now();

  // First, try to find a cached price (case-insensitive)
  const cachedToken = Object.keys(tokenPriceCache).find(
    k => normalizeTokenSymbol(k) === normalizedToken
  );

  // If we have a valid cached price, return it
  if (cachedToken) {
    const cachedPrice = getCachedPrice(cachedToken);
    if (cachedPrice !== null) {
      return cachedPrice;
    }
  }

  // If we have an expired cache, use it while we fetch a new one
  const expiredCache = cachedToken ? tokenPriceCache[cachedToken]?.priceUSD : undefined;

  // If we're rate limited, use expired cache or default price
  if (now < rateLimitResetTime) {
    console.warn(`Rate limited, using ${expiredCache !== undefined ? 'expired cached' : 'default'} price for ${token}`);
    return expiredCache !== undefined ? expiredCache : (DEFAULT_PRICES[normalizedToken] || 0);
  }

  try {
    // Determine the base URL based on environment
    const baseUrl = typeof window === 'undefined'
      ? process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
      : '';

    // Use the API endpoint with proper base URL
    const response = await fetch(`${baseUrl}/api/token-price?token=${token}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Handle rate limiting (status 429)
    if (response.status === 429) {
      // Try to get Retry-After header, default to 60 seconds if not available
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10) * 1000;
      rateLimitResetTime = now + retryAfter;
      console.warn(`Rate limited, will retry after ${retryAfter / 1000} seconds`);
      return expiredCache !== undefined ? expiredCache : (DEFAULT_PRICES[token] || 0);
    }

    if (!response.ok) {
      console.error(`Failed to fetch ${token} price: ${response.statusText}`);
      // If we have an expired cache, use it
      if (expiredCache !== undefined) {
        console.warn(`Using expired cached price for ${token} due to error`);
        return expiredCache;
      }

      // Try to find a default price with case-insensitive match
      const defaultPriceKey = Object.keys(DEFAULT_PRICES).find(
        k => normalizeTokenSymbol(k) === normalizedToken
      );
      if (defaultPriceKey) {
        console.warn(`Using default price for ${token} due to error`);
        return DEFAULT_PRICES[defaultPriceKey];
      }
      return 0;
    }

    const data = await response.json();
    const price = data.price;

    // Update the cache with the new price using the original token case for consistency
    const existingCacheKey = Object.keys(tokenPriceCache).find(
      k => normalizeTokenSymbol(k) === normalizedToken
    ) || token; // Use the provided token as key if no existing cache found

    tokenPriceCache[existingCacheKey] = {
      priceUSD: price,
      timestamp: now,
    };

    return price;
  } catch (error) {
    console.error(`Error fetching ${token} price:`, error);
    return expiredCache !== undefined ? expiredCache : (DEFAULT_PRICES[token] || 0);
  }
}

export async function fetchWalletBalances(address: string): Promise<TokenBalance[]> {
  try {

    // First, get all coins owned by the address
    const response = await fetch('https://fullnode.mainnet.sui.io:443', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'suix_getAllBalances',
        params: [address],
      }),
    });

    const data = await response.json();

    if (!data.result) {
      console.error('[fetchWalletBalances] Error in API response:', data.error);
      return [];
    }

    // Process each coin type
    const balances = await Promise.all(
      data.result.map(async (balance: any, index: number) => {
        const coinType = balance.coinType;
        let symbol = 'UNKNOWN';
        let decimals = 0;

        // Handle SUI token (more flexible matching for different SUI coin types)
        if (coinType.endsWith('::sui::SUI') || coinType.endsWith('::sui::sui::SUI') ||
          coinType.endsWith('0x2::sui::SUI') || coinType.endsWith('0x2::sui::sui::SUI')) {
          symbol = 'SUI';
          decimals = 9;
        }
        // Handle USDC token (more flexible matching for different USDC implementations)
        else if (coinType.endsWith('::usdc::USDC') ||
          coinType.includes('USDC') ||
          coinType.includes('usdc') ||
          coinType.includes('0x5d4b302506645c37ff133b98c4b50a5ae14841659738d86823d861affcf25683::usdc::USDC')) {
          symbol = 'USDC';
          decimals = 6;
        }
        // Handle DEEP token
        else if (coinType.endsWith('::deep::DEEP') ||
          coinType.includes('0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP')) {
          symbol = 'DEEP';
          decimals = 6;
        } else {
          console.log(`[fetchWalletBalances] Unknown token type: ${coinType}`);
        }

        if (symbol === 'UNKNOWN') {
          console.log(`[fetchWalletBalances] Skipping unknown token type: ${coinType}`);
          return null;
        }

        const balanceValue = BigInt(balance.totalBalance || '0');
        const numericBalance = Number(balanceValue) / (10 ** decimals);

        try {
          // Get token price in USD
          const priceUSD = await getTokenPrice(symbol);

          // Handle zero balance case
          if (numericBalance === 0) {
            return {
              symbol,
              balance: '0',
              decimals,
              priceUSD,
              priceGBP: 0,
              valueUSD: 0,
              valueGBP: 0,
              profitLoss: 0,
              priceChange24h: 0,
              coinType,
              lastUpdated: new Date().toISOString()
            } as TokenBalance;
          }

          // Calculate USD value first
          const valueUSD = numericBalance * priceUSD;

          // Convert USD value to GBP
          let valueGBP = 0;
          try {
            valueGBP = await convertToGBP(valueUSD);
          } catch (error) {
            console.error('Error converting to GBP, using 1:1 rate:', error);
            valueGBP = valueUSD; // Fallback to USD value if conversion fails
          }

          return {
            symbol,
            balance: balanceValue.toString(),
            decimals,
            priceUSD,
            priceGBP: numericBalance > 0 ? valueGBP / numericBalance : 0,
            valueUSD,
            valueGBP,
            profitLoss: 0, // This would be calculated based on cost basis
            priceChange24h: 0, // Would come from price API
            coinType,
            lastUpdated: new Date().toISOString()
          } as TokenBalance;
        } catch (error) {
          console.error(`Error processing balance for ${symbol}:`, error);
          return null;
        }
      })
    );

    // Filter out null values and sort by value in descending order
    return balances.filter((b): b is TokenBalance => b !== null)
      .sort((a, b) => b.valueUSD - a.valueUSD);
  } catch (error) {
    console.error('Error in fetchWalletBalances:', error);
    return [];
  }
}

export async function fetchAllWalletTransactions(
  address: string,
  startTime?: number,
  endTime?: number
): Promise<SuiTransaction[]> {
  console.log('Fetching all transactions for address:', address, 'from', startTime, 'to', endTime);
  let allTransactions: SuiTransaction[] = [];
  let cursor: string | null = null;
  const limit = 50; // Maximum allowed by the API
  let hasMore = true;

  while (hasMore) {
    const result = await fetchWalletTransactions(address, cursor, limit);
    const { data, nextCursor } = result;

    console.log(`Fetched ${data.length} transactions, nextCursor:`, nextCursor);

    // Filter transactions by date range if provided
    const filteredData = data.filter(tx => {
      const txTime = parseInt(tx.timestampMs);
      return (!startTime || txTime >= startTime) &&
        (!endTime || txTime <= endTime);
    });

    allTransactions = [...allTransactions, ...filteredData];

    // If we got fewer transactions than requested, or if we've hit our date range limit
    if (data.length < limit || (endTime && filteredData.length < data.length)) {
      hasMore = false;
    } else {
      cursor = nextCursor;
      if (!cursor) hasMore = false;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return allTransactions;
}

function getTokenSymbol(coinType: string): string {
  if (!coinType) return 'TOKEN';
  if (coinType.includes('sui::sui::SUI') || coinType.endsWith('::sui::SUI')) return 'SUI';
  if (coinType.includes('usdc::USDC') || coinType.endsWith('::usdc::USDC')) return 'USDC';
  if (coinType.includes('deep::DEEP') || coinType.endsWith('::deep::DEEP')) return 'DEEP';
  if (coinType.includes('sca::SCA') || coinType.endsWith('::sca::SCA')) return 'SCA';
  if (coinType.includes('::')) return coinType.split('::').pop() || 'TOKEN';
  return 'TOKEN';
}

export function processTransactionData(transactions: SuiTransaction[], walletAddress: string) {
  return transactions.flatMap(tx => {
    try {
      const transfers: any[] = [];

      const setSender = function (sender) {
        if (sender === walletAddress) {
          return 'self';
        }
        return sender;
      }
      const setAsset = function (asset) {
        let assetName = '';
        if (asset !== undefined && asset['name'] !== undefined) {
          assetName = asset.name;
        }
        if (assetName === "0000000000000000000000000000000000000000000000000000000000000002::sui::SUI") {
          return 'SUI';
        }
        if (assetName === "dba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC") {
          return 'USDC';
        }
        if (assetName === "deeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP") {
          return 'DEEP';
        }
        return asset;
      }

      transfers.push({
        id: tx.digest,
        timestamp: parseInt(tx.timestampMs || '0'),
        raw: tx.raw,
        sender: setSender(tx.raw.sender),
        owner: tx.raw.parsedJson.owner || undefined,
        module: tx.raw.transactionModule,
        json: tx.raw.parsedJson,
        type: tx.raw.type,
        amount: tx.raw.parsedJson.amount || undefined,
        asset: setAsset(tx.raw.parsedJson.asset),
      });

      return transfers;

    } catch (error) {
      console.error('Error processing transaction:', tx.digest, error);
      return null;
    }
  }).filter(Boolean); // Filter out any null/undefined entries
}

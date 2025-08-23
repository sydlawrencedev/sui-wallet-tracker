import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from 'vitest';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { NextResponse } from 'next/server';

// Mock environment variables
process.env.SUI_NETWORK = 'testnet';
process.env.NEXT_PUBLIC_SUI_NETWORK = 'testnet';

// Mock the SuiClient
const mockSuiClient = {
  getCoins: vi.fn().mockResolvedValue({
    data: [
      { coinObjectId: '0x1', balance: '1000000000' },
      { coinObjectId: '0x2', balance: '1000000000' },
    ],
  }),
  dryRunTransactionBlock: vi.fn().mockResolvedValue({
    effects: { status: { status: 'success' } },
  }),
};

// Mock the SuiClient class
vi.mock('@mysten/sui/client', () => ({
  SuiClient: class {
    constructor() {
      return mockSuiClient;
    }
    
    static fromEnv() {
      return mockSuiClient;
    }
  },
}));

// Mock the Ed25519Keypair
vi.mock('@mysten/sui/keypairs/ed25519', () => ({
  Ed25519Keypair: {
    fromSecretKey: vi.fn().mockReturnValue({
      getPublicKey: () => ({
        toSuiAddress: () => '0x123',
      }),
      signTransactionBlock: vi.fn().mockResolvedValue({
        signature: 'test-signature',
      }),
    }),
  },
}));

// Mock the Transaction class
const mockTransaction = {
  setSender: vi.fn().mockReturnThis(),
  setExpiration: vi.fn().mockReturnThis(),
  splitCoins: vi.fn().mockReturnValue(['coin1']),
  mergeCoins: vi.fn().mockReturnThis(),
  moveCall: vi.fn().mockReturnValue(['suiCoin']),
  transferObjects: vi.fn().mockReturnThis(),
  build: vi.fn().mockResolvedValue({ toBytes: () => new Uint8Array() }),
  pure: {
    u64: vi.fn().mockImplementation((value) => value),
    u8: vi.fn().mockImplementation((value) => value),
  },
  object: vi.fn().mockImplementation((id) => id),
};

vi.mock('@mysten/sui/transactions', () => ({
  Transaction: class {
    constructor() {
      return mockTransaction;
    }
  },
}));

// Mock the next/headers module
vi.mock('next/headers', () => ({
  headers: () => ({
    get: (key: string) => {
      if (key === 'x-forwarded-proto') return 'http';
      if (key === 'host') return 'localhost:3000';
      return '';
    },
  }),
}));

// Mock the process.env
vi.stubEnv('SUI_PRIVATE_KEY', 'test-private-key');

// Import the module to test after setting up mocks
import { POST } from '../app/api/swap/route';

// Mock NextResponse
vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: any, options: any) => ({
      json: () => Promise.resolve(data),
      status: options?.status || 200,
    }),
  },
}));

describe('Swap API', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    // Store original environment variables
    originalEnv = process.env;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  it('should create a swap transaction', async () => {
    // Increase test timeout to 30 seconds
    vi.setConfig({ testTimeout: 30000 });
    // Mock the transaction builder
    const mockTxb = {
      setSender: vi.fn().mockReturnThis(),
      setExpiration: vi.fn().mockReturnThis(),
      splitCoins: vi.fn().mockReturnValue(['coin1']),
      moveCall: vi.fn().mockReturnValue(['suiCoin']),
      transferObjects: vi.fn().mockReturnThis(),
      build: vi.fn().mockResolvedValue({ toBytes: () => new Uint8Array() }),
    };

    // Mock the TransactionBlock
    vi.mock('@mysten/sui/transactions', () => ({
      Transaction: {
        from: vi.fn().mockImplementation(() => mockTxb),
      },
    }));

    // Mock the keypair
    vi.mock('@mysten/sui/keypairs/ed25519', () => ({
      Ed25519Keypair: {
        fromSecretKey: vi.fn().mockReturnValue({
          getPublicKey: () => ({
            toSuiAddress: () => '0x123',
          }),
          signTransactionBlock: vi.fn().mockResolvedValue({
            signature: 'test-signature',
          }),
        }),
      },
    }));

    // Mock the request and response objects
    const mockRequest = {
      json: vi.fn().mockResolvedValue({
        address: '0x123',
        amount: '1000000', // 1 USDC (6 decimals)
      }),
      headers: new Headers({
        'content-type': 'application/json',
      }),
    } as unknown as Request;

    // Import the module dynamically to apply mocks
    const { POST } = await import('../app/api/swap/route');
    
    // Execute the POST handler
    const response = await POST(mockRequest as any);
    const result = await response.json();

    // Assertions
    expect(response.status).toBe(200);
    expect(result).toHaveProperty('transactionBlockBytes');
    expect(result).toHaveProperty('signature');
    
    // Verify transaction builder was called correctly
    expect(mockTxb.setSender).toHaveBeenCalledWith('0x123');
    expect(mockTxb.moveCall).toHaveBeenCalled();
  });

  it('should handle missing private key', async () => {
    // Temporarily remove private key
    const tempKey = process.env.SUI_PRIVATE_KEY;
    delete process.env.SUI_PRIVATE_KEY;

    // Mock the request
    const mockRequest = {
      json: vi.fn().mockResolvedValue({
        address: '0x123',
        amount: '1000000',
      }),
      headers: new Headers({
        'content-type': 'application/json',
      }),
    } as unknown as Request;

    // Import the module dynamically to apply mocks
    const { POST } = await import('../app/api/swap/route');
    
    // Execute the POST handler
    const response = await POST(mockRequest as any);
    const result = await response.json();

    // Restore private key
    process.env.SUI_PRIVATE_KEY = tempKey;

    // Assertions
    expect(response.status).toBe(500);
    expect(result).toHaveProperty('error');
    expect(result.error).toContain('SUI_PRIVATE_KEY');
  });
});

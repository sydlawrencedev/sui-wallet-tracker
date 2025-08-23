import { vi } from 'vitest';

// Mock environment variables
process.env.NEXT_PUBLIC_SUI_NETWORK = 'testnet';

// Type declarations for global objects
declare global {
  interface Window {
    matchMedia: (query: string) => MediaQueryList;
  }
  
  // Extend global type for fetch mock
  // @ts-ignore - This is a test file, we can safely ignore the type error here
  var fetch: jest.Mock;
}

// Mock window object for browser APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock the SuiClient
vi.mock('@mysten/sui/client', async () => {
  const actual = await vi.importActual('@mysten/sui/client');
  return {
    ...(actual as object),
    SuiClient: {
      fromEnv: vi.fn().mockReturnValue({
        getCoins: vi.fn().mockResolvedValue({
          data: [
            { coinObjectId: '0x1', balance: '1000000000' },
            { coinObjectId: '0x2', balance: '1000000000' },
          ],
        }),
        dryRunTransactionBlock: vi.fn().mockResolvedValue({
          effects: { status: { status: 'success' } },
        }),
      }),
    },
  };
});

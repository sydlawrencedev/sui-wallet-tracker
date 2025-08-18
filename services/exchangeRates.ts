const CACHE_KEY_PREFIX = 'exchange_rate_';
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

type RateCache = {
  rate: number;
  timestamp: number;
};

export async function getExchangeRate(
  date: Date = new Date(),
  fromCurrency: string = 'USD',
  toCurrency: string = 'GBP'
): Promise<number> {
  const cacheKey = `${CACHE_KEY_PREFIX}${fromCurrency}_${toCurrency}_${date.toISOString().split('T')[0]}`;
  
  // Try to get from cache first
  const cached = getFromCache(cacheKey);
  if (cached) {
    return cached.rate;
  }

  const apiKey = process.env.NEXT_PUBLIC_OPEN_EXCHANGE_RATES_API_KEY;
  if (!apiKey) {
    const error = new Error('Open Exchange Rates API key not found in environment variables');
    console.error('[getExchangeRate]', error);
    throw error;
  }

  const isHistorical = date.toDateString() !== new Date().toDateString();
  const url = isHistorical
    ? `https://openexchangerates.org/api/historical/${date.toISOString().split('T')[0]}.json?app_id=${apiKey}&base=USD&symbols=GBP`
    : `https://openexchangerates.org/api/latest.json?app_id=${apiKey}&base=USD&symbols=GBP`;
  
  let response;
  try {
    response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(`Failed to fetch exchange rates (${response.status}): ${errorText}`);
      console.error('[getExchangeRate]', error);
      throw error;
    }
  } catch (error) {
    console.error('[getExchangeRate] Fetch error:', error);
    throw error;
  }

  let data;
  try {
    data = await response.json();
    
    if (!data || typeof data !== 'object') {
      const error = new Error(`Invalid exchange rate response format: ${JSON.stringify(data)}`);
      console.error('[getExchangeRate]', error);
      throw error;
    }
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    const error = new Error(`Error parsing exchange rate response: ${errorMessage}`);
    console.error('[getExchangeRate]', error);
    throw error;
  }

  // Handle API error responses
  if (data.error) {
    const error = new Error(`Exchange rate API error: ${data.description || data.message || 'Unknown error'}`);
    console.error('[getExchangeRate]', error);
    throw error;
  }

  const rate = data.rates?.GBP;
  
  if (rate === undefined) {
    const error = new Error(`GBP rate not found in response: ${JSON.stringify(data)}`);
    console.error('[getExchangeRate]', error);
    throw error;
  }
  
  const rateNum = typeof rate === 'number' ? rate : parseFloat(rate);
  
  if (isNaN(rateNum) || rateNum <= 0) {
    const error = new Error(`Invalid exchange rate value received: ${rate}`);
    console.error('[getExchangeRate]', error);
    throw error;
  }
  
  // Cache the result
  try {
    saveToCache(cacheKey, rateNum);
  } catch (error) {
    console.error('[getExchangeRate] Error caching rate:', error);
    // Don't fail if caching fails, just log it
  }
  
  return rateNum;
}

function getFromCache(key: string): RateCache | null {
  if (typeof window === 'undefined') return null;
  
  const cached = localStorage.getItem(key);
  if (!cached) return null;

  try {
    const { rate, timestamp } = JSON.parse(cached) as RateCache;
    if (Date.now() - timestamp < CACHE_DURATION_MS) {
      return { rate, timestamp };
    }
  } catch (error) {
    console.error('Error parsing cached rate:', error);
  }
  
  return null;
}

function saveToCache(key: string, rate: number): void {
  if (typeof window === 'undefined') return;
  
  try {
    const cache: RateCache = {
      rate,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(cache));
  } catch (error) {
    console.error('Error saving to cache:', error);
  }
}

export async function convertToGBP(usdAmount: number, date: Date = new Date()): Promise<number> {
  
  if (isNaN(usdAmount)) {
    const error = new Error(`Invalid amount provided to convertToGBP: ${usdAmount}`);
    console.error(error);
    throw error;
  }
  
  if (usdAmount === 0) {
    return 0;
  }
  
  try {
    // Get the USD to GBP exchange rate (1 USD = X GBP)
    const usdToGbpRate = await getExchangeRate(date);
    
    if (isNaN(usdToGbpRate) || usdToGbpRate <= 0) {
      const error = new Error(`Invalid exchange rate received: ${usdToGbpRate}`);
      console.error(error);
      throw error;
    }
    
    // Convert USD to GBP by multiplying by the exchange rate
    const gbpAmount = usdAmount * usdToGbpRate;
    
    if (isNaN(gbpAmount)) {
      const error = new Error(`Conversion resulted in NaN. Amount: ${usdAmount}, Rate: ${usdToGbpRate}`);
      console.error(error);
      throw error;
    }
    
    // Round to 6 decimal places for consistency
    const roundedResult = parseFloat(gbpAmount.toFixed(6));
    return roundedResult;
  } catch (error) {
    console.error('[convertToGBP] Error in convertToGBP:', error);
    // Fallback to a default rate if the API fails
    const fallbackRate = 0.79; // Fallback rate if API fails
    console.warn(`[convertToGBP] Using fallback rate: ${fallbackRate}`);
    return usdAmount * fallbackRate;
  }
}

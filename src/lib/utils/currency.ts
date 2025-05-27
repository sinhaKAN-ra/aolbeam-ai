import { cache } from 'react';

// Cache the exchange rates for 1 hour
const EXCHANGE_RATE_CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

interface ExchangeRates {
  rates: Record<string, number>;
  timestamp: number;
}

let cachedRates: ExchangeRates | null = null;

export const getExchangeRates = cache(async (): Promise<Record<string, number>> => {
  // Return cached rates if they're still valid
  if (cachedRates && Date.now() - cachedRates.timestamp < EXCHANGE_RATE_CACHE_DURATION) {
    return cachedRates.rates;
  }

  try {
    // Using ExchangeRate-API (free tier)
    const response = await fetch(
      `https://open.er-api.com/v6/latest/INR`,
      { next: { revalidate: 3600 } } // Revalidate every hour
    );

    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates');
    }

    const data = await response.json();
    
    // Cache the rates
    cachedRates = {
      rates: data.rates,
      timestamp: Date.now()
    };

    return data.rates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    // Fallback to hardcoded rates if API fails
    return {
      USD: 0.012,
      EUR: 0.011,
      GBP: 0.0095,
      INR: 1,
      AUD: 0.018,
      CAD: 0.016,
      SGD: 0.016,
      JPY: 1.82,
      AED: 0.044,
      SAR: 0.045,
      MYR: 0.057,
      NZD: 0.020,
      CHF: 0.011,
      SEK: 0.13,
      NOK: 0.13,
      DKK: 0.082,
      PLN: 0.048,
      CZK: 0.28,
      HUF: 4.35,
      ILS: 0.045,
      ZAR: 0.23,
      BRL: 0.060,
      MXN: 0.20,
      ARS: 10.45,
      CLP: 11.85,
      COP: 47.50,
      PEN: 0.045,
      UYU: 0.47,
      VES: 0.43,
      TRY: 0.39,
      RUB: 1.12,
      KZT: 5.65,
      UAH: 0.47,
      RON: 0.055,
      BGN: 0.022,
      HRK: 0.082,
      RSD: 1.28,
      HKD: 0.094,
      TWD: 0.39,
      KRW: 16.35,
      PHP: 0.68,
      IDR: 192.50,
      THB: 0.44,
      VND: 298.50
    };
  }
});

export interface CurrencyDetails {
  currency: string;
  symbol: string;
  minAmount: number;
  maxAmount: number;
  supported: boolean;
}

export const getCurrencyDetails = (country: string): CurrencyDetails => {
  const currencies: Record<string, CurrencyDetails> = {
    IN: {
      currency: 'INR',
      symbol: '₹',
      minAmount: 10,
      maxAmount: 100000,
      supported: true
    },
    US: {
      currency: 'USD',
      symbol: '$',
      minAmount: 0.50,
      maxAmount: 10000,
      supported: true
    },
    GB: {
      currency: 'GBP',
      symbol: '£',
      minAmount: 0.40,
      maxAmount: 8000,
      supported: true
    },
    EU: {
      currency: 'EUR',
      symbol: '€',
      minAmount: 0.45,
      maxAmount: 9000,
      supported: true
    },
    AU: {
      currency: 'AUD',
      symbol: 'A$',
      minAmount: 0.75,
      maxAmount: 15000,
      supported: true
    },
    CA: {
      currency: 'CAD',
      symbol: 'C$',
      minAmount: 0.65,
      maxAmount: 13000,
      supported: true
    },
    SG: {
      currency: 'SGD',
      symbol: 'S$',
      minAmount: 0.65,
      maxAmount: 13000,
      supported: true
    },
    JP: {
      currency: 'JPY',
      symbol: '¥',
      minAmount: 50,
      maxAmount: 1000000,
      supported: true
    },
    AE: {
      currency: 'AED',
      symbol: 'د.إ',
      minAmount: 2,
      maxAmount: 40000,
      supported: true
    },
    SA: {
      currency: 'SAR',
      symbol: '﷼',
      minAmount: 2,
      maxAmount: 40000,
      supported: true
    },
    MY: {
      currency: 'MYR',
      symbol: 'RM',
      minAmount: 2,
      maxAmount: 40000,
      supported: true
    }
  };

  return currencies[country] || currencies['US']; // Default to USD if country not found
};

export const convertAmount = async (
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> => {
  try {
    const rates = await getExchangeRates();
    const inrAmount = amount / rates[fromCurrency];
    return Number((inrAmount * rates[toCurrency]).toFixed(2));
  } catch (error) {
    console.error('Error converting amount:', error);
    throw new Error('Failed to convert amount');
  }
};

export const formatCurrency = (
  amount: number,
  currency: string,
  locale: string = 'en-US'
): string => {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return `${currency} ${amount.toFixed(2)}`;
  }
}; 
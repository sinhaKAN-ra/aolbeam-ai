// Type definitions for Cashfree SDK

interface CashfreeCheckoutResult {
  error?: {
    message: string;
    code?: string;
  };
  success?: boolean;
  data?: any;
}

interface CashfreeCheckoutOptions {
  subsSessionId: string;
  redirectTarget?: "_self" | "_blank";
}

interface CashfreeCheckout {
  subscriptionsCheckout: (options: CashfreeCheckoutOptions) => Promise<CashfreeCheckoutResult>;
}

interface CashfreeInstance {
  checkout?: CashfreeCheckout;
  subscriptionsCheckout?: (options: CashfreeCheckoutOptions) => Promise<CashfreeCheckoutResult>;
}

interface CashfreeConstructor {
  (options: { mode: string }): CashfreeInstance;
  checkout?: CashfreeCheckout;
  subscriptionsCheckout?: (options: CashfreeCheckoutOptions) => Promise<CashfreeCheckoutResult>;
}

declare global {
  interface Window {
    Cashfree: CashfreeConstructor;
  }
}

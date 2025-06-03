// Type definitions for Cashfree SDK

interface CashfreeCheckoutResult {
  error?: {
    message: string;
    code?: string;
  };
  success?: boolean;
  data?: any;
}

declare module '@cashfreepayments/cashfree-js' {
  interface CashfreeOptions {
    mode: 'production' | 'sandbox';
  }

  interface CashfreeRedirectOptions {
    paymentSessionId: string;
    redirectTarget?: '_self' | '_blank';
    components?: string[];
    theme?: {
      color?: string;
      backgroundColor?: string;
      errorColor?: string;
      themeColor?: string;
      iconBackground?: string;
      hideHeader?: boolean;
      hideOrderSummary?: boolean;
      hidePaymentModes?: boolean;
    };
  }

  interface Cashfree {
    checkout: (options: CashfreeRedirectOptions) => void;
  }

  function load(options: CashfreeOptions): Promise<Cashfree | undefined>;
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

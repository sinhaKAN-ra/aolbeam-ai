// src/services/payment/cashfree/CashfreePaymentService.ts
import { 
  CashfreeSubscriptionRequestPayload, 
  CashfreeSubscriptionResponseData, 
  CashfreeErrorResponseData 
} from './types';

const CASHFREE_API_VERSION = "2023-08-01";

interface CashfreeConfig {
  appId: string;
  secretKey: string;
  mode: 'sandbox' | 'production' | string;
}

export class CashfreePaymentService {
  private appId: string;
  private secretKey: string;
  private baseUrl: string;

  constructor(config: CashfreeConfig) {
    this.appId = config.appId;
    this.secretKey = config.secretKey;
    const validMode = (config.mode === 'sandbox' || config.mode === 'production') ? config.mode : 'sandbox';
    this.baseUrl = validMode === 'sandbox' 
      ? "https://sandbox.cashfree.com/pg" 
      : "https://api.cashfree.com/pg";
  }

  public async createSubscription(
    payload: CashfreeSubscriptionRequestPayload
  ): Promise<{ success: true, data: CashfreeSubscriptionResponseData } | { success: false, error: CashfreeErrorResponseData }> {
    const url = `${this.baseUrl}/subscriptions`;
    
    const headers = {
      "Content-Type": "application/json",
      "x-api-version": CASHFREE_API_VERSION,
      "x-client-id": this.appId,
      "x-client-secret": this.secretKey,
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Cashfree API Error:", result);
        return { success: false, error: result as CashfreeErrorResponseData };
      }
      return { success: true, data: result as CashfreeSubscriptionResponseData };
    } catch (error: any) {
      console.error("Error creating Cashfree subscription:", error);
      return { 
        success: false, 
        error: { 
          message: error.message || "Network error or unexpected issue during Cashfree subscription creation.",
          type: "client_error" 
        } 
      };
    }
  }

  // Placeholder for future methods:
  // public async getSubscriptionStatus(subscriptionId: string): Promise<...> {}
  // public async cancelSubscription(cfSubscriptionId: string): Promise<...> {}
}

export const getCashfreeServiceInstance = (): CashfreePaymentService => {
  const appId = process.env.CASHFREE_APP_ID;
  const secretKey = process.env.CASHFREE_SECRET_KEY;
  const mode = process.env.NEXT_PUBLIC_CASHFREE_MODE || 'sandbox'; 

  if (!appId) {
    throw new Error("CASHFREE_APP_ID is not configured in environment variables.");
  }
  if (!secretKey) {
    throw new Error("CASHFREE_SECRET_KEY is not configured in environment variables.");
  }

  return new CashfreePaymentService({ appId, secretKey, mode });
};

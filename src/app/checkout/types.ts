// Types for the checkout page
export type PlanId = 'weekly' | 'monthly' | 'quarterly';
export type PaymentMethod = 'paypal' | 'lemonsqueezy' | 'cashfree' | 'manual' | null;
export type PaymentType = 'one-time' | 'subscription' | null;
export type PaymentProvider = 'cashfree' | 'lemonsqueezy';
export type SubscriptionInterval = 'weekly' | 'monthly' | 'quarterly';

export interface CheckoutPlanInfo {
  id: string; // Original plan ID from pricing page
  name: string;
  features: string[];
  originalType: 'subscription' | 'one_time'; // Type from pricing page plan definition
  countryCode: string;
  currencySymbol: string; // e.g., '₹', '$'
  baseNumericPrice: number; // Numeric price of the plan
  duration?: string; // e.g., "/ month", for display
  interval?: string; // e.g., "monthly", "weekly" - for subscription interval
}

// export interface ConvertedPlan {
//   id: PlanId;
//   name: string;
//   price: string;
//   originalPrice: string;
//   oneTimePrice: string;
//   basePrice: number;
//   baseOriginalPrice: number;
//   subscriptionPrice: string;
//   provider: PaymentProvider;
//   features: readonly string[];
//   description: string;
//   duration?: string;
//   interval?: SubscriptionInterval;
//   subscriptionEnabled?: boolean;
//   type: 'subscription' | 'one_time';
// }

export interface PaymentHandlerProps {
  plan: CheckoutPlanInfo | null;
  paymentType: PaymentType;
  customerPhone: string;
  setPaymentError: (error: string | null) => void;
  setIsPaymentProcessing: (processing: boolean) => void;
  user: any;
  session: any;
}

export interface OrderResponse {
  success: boolean;
  data?: {
    payment_session_id?: string;
    order_id?: string;
    order_token?: string;
    paymentLink?: string;
    subscription_id?: string;
    is_subscription?: boolean;
    auth_url?: string; // Added for Cashfree subscription redirection
  };
  error?: string;
}

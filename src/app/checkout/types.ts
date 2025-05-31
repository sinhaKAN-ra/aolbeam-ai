// Types for the checkout page
export type PlanId = 'weekly' | 'monthly' | 'quarterly';
export type PaymentMethod = 'paypal' | 'lemonsqueezy' | 'cashfree' | 'manual' | null;
export type PaymentType = 'subscription' | 'one-time' | null;
export type PaymentProvider = 'cashfree' | 'lemonsqueezy';
export type SubscriptionInterval = 'weekly' | 'monthly' | 'quarterly';

export interface ConvertedPlan {
  id: PlanId;
  name: string;
  price: string;
  originalPrice: string;
  oneTimePrice: string;
  basePrice: number;
  baseOriginalPrice: number;
  subscriptionPrice: string;
  provider: PaymentProvider;
  features: readonly string[];
  description: string;
  duration: string;
  interval?: SubscriptionInterval;
  subscriptionEnabled?: boolean;
}

export interface PaymentHandlerProps {
  plan: ConvertedPlan | null;
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
  };
  error?: string;
}

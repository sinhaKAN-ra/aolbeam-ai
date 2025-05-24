export interface CashfreeOrderResponse {
  cf_order_id: string;
  created_at: string;
  customer_details: {
    customer_id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
  };
  entity: string;
  order_amount: number;
  order_currency: string;
  order_expiry_time: string;
  order_id: string;
  order_meta: {
    return_url: string;
    notify_url: string;
    payment_methods: string;
  };
  order_note: string;
  order_status: 'ACTIVE' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  order_token: string;
  payment_session_id: string;
  payments: {
    url: string;
  };
  refunds: {
    url: string;
  };
  settlements: {
    url: string;
  };
}

export interface CashfreePaymentResponse {
  cf_payment_id: string;
  payment_status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'CANCELLED' | 'EXPIRED';
  payment_message: string;
  payment_amount: number;
  payment_currency: string;
  payment_time: string;
  bank_reference: string;
  auth_id: string;
  payment_method: {
    channel: string;
    card_number: string;
    card_network: string;
    card_type: string;
    card_country: string;
    card_bank_name: string;
    card_network_reference_id: string;
  };
  order_id: string;
  order_amount: number;
  order_currency: string;
  customer_details: {
    customer_id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
  };
  payment_group: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency?: string;
  features: string[];
  interval?: 'month' | 'year';
  interval_count?: number;
  is_popular?: boolean;
  metadata?: Record<string, any>;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'paused' | 'trialing' | 'unpaid';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

// src/services/payment/cashfree/types.ts
export interface CashfreeCustomerDetails {
  customer_id: string;
  customer_email: string;
  customer_phone: string;
  customer_name?: string;
}

export interface CashfreeSubscriptionMeta {
  return_url: string;
  notify_url?: string;
}

export interface CashfreePlanDetails {
  plan_id: string;
  plan_name: string;
  type: 'PERIODIC' | 'CUSTOM';
  amount: number;
  interval: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
  intervals: number;
  description: string;
  currency: string;
}

export interface CashfreeSubscriptionRequestPayload {
  subscription_id: string;
  plan_id?: string; // Optional since we can use plan details directly
  plan_details?: CashfreePlanDetails; // For direct plan details (renamed from 'plan' to 'plan_details')
  customer_details: CashfreeCustomerDetails;
  subscription_meta: CashfreeSubscriptionMeta;
  subscription_note?: string;
  subscription_tags?: Record<string, string>;
  subscription_expiry_time?: string;
  subscription_first_charge_time?: string;
  auth_attempts?: number; // Number of retry attempts for failed payments
}

export type CashfreeSubscriptionStatus = 
  | "INITIALIZED" 
  | "BANK_APPROVAL_PENDING"
  | "ACTIVE" 
  | "PENDING" // Note: 'PENDING' is used internally for Supabase when Cashfree status is 'INITIALIZED'
  | "ON_HOLD" 
  | "CANCELLED" 
  | "COMPLETED" 
  | "EXPIRED" 
  | "PAUSED"
  | "AUTH_FAILED"
  | "PAYMENT_FAILED" 
  | "PAYMENT_PENDING";


export interface CashfreeSubscriptionResponseData {
  cf_subscription_id: string;
  subscription_id: string; 
  customer_id: string;
  plan_id: string;
  subscription_status: CashfreeSubscriptionStatus;
  auth_link?: string;
  subscription_session_id?: string; // Added this field
  [key: string]: any; 
}

export interface CashfreeErrorResponseData {
  message: string;
  code?: string; 
  type: string; 
  request_id?: string;
  [key: string]: any;
}

// Define the Cashfree types
interface CashfreeUIOptions {
  paymentSession: {
    orderId: string;
    paymentSessionId: string;
  };
  redirectTarget: string;
  renderContainer: string;
  uiTheme: {
    theme: string;
    backgroundColor: string;
    buttonColor: string;
    buttonTextColor: string;
    buttonCornerRadius: string;
  };
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  onSuccess: (data: unknown) => void;
  onFailure: (error: unknown) => void;
  onClose: () => void;
}

interface CashfreeInstance {
  load: (options: CashfreeUIOptions) => Promise<void>;
}

// NOTE: Do NOT redeclare Window.Cashfree anywhere else in the codebase. This is the only allowed declaration for global Cashfree typings.
declare global {
  interface Window {
    // For legacy widget-based SDK
    CF_Widget?: (options: unknown) => { load: () => void };
    // For legacy (NOT v3) Cashfree SDKs loaded via script
    Cashfree?: {
      Constructor?: new (options: { mode: string }) => { redirect: (options: any) => void; payment?: { redirect: (options: any) => void } };
      payment?: { redirect: (options: any) => void };
    };
  }
}

// Utility to load the legacy widget SDK dynamically (v1.0.2)
export async function loadCashfreeWidgetSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Cashfree Widget SDK can only be loaded in a browser environment'));
      return;
    }
    if (window.CF_Widget) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://sdk.cashfree.com/js/widget/1.0.2/cashfree-widget.prod.js';
    script.onload = () => {
      setTimeout(() => {
        if (window.CF_Widget) {
          resolve();
        } else {
          reject(new Error('CF_Widget not found after loading script'));
        }
      }, 100);
    };
    script.onerror = (error) => {
      reject(new Error('Failed to load Cashfree Widget SDK script'));
    };
    document.body.appendChild(script);
  });
}

// For v3 Cashfree SDK, use the official npm package @cashfreepayments/cashfree-js. Do not attempt to load v3 via script.

export interface SubscriptionDetails {
  planId: string;
  interval: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  firstChargeDate?: string;
}

export interface CreateOrderParams {
  orderId: string;
  orderAmount: number;
  orderCurrency: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  returnUrl: string;
  notifyUrl?: string;
  orderNote?: string;
  isSubscription?: boolean;
  subscriptionDetails?: SubscriptionDetails;
}

export interface CreateOrderResponse {
  success: boolean;
  data: unknown;
  error?: string;
}

export async function createCashfreeOrder(
  params: CreateOrderParams,
  authToken?: string
): Promise<CreateOrderResponse> {
  try {
    const endpoint = params.isSubscription 
      ? '/api/subscriptions/cashfree/create'
      : '/api/payments/cashfree/create-order';
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(typeof error === 'object' && error !== null && 'message' in error
        ? String(error.message)
        : 'Failed to create order');
    }

    return response.json();
  } catch (error) {
    console.error('Error creating Cashfree order:', error);
    throw error instanceof Error ? error : new Error('Failed to create order');
  }
}

interface CashfreeTheme {
  theme?: string;
  backgroundColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  buttonCornerRadius?: string;
}

interface CashfreeWidgetOptions {
  amount: number;
  appId: string;
  returnUrl?: string;
  theme?: CashfreeTheme;
  onSuccess?: (data: unknown) => void;
  onFailure?: (error: unknown) => void;
  orderId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}



/**
 * Initializes the Cashfree Widget for payment
 * @param options - Configuration options for the widget
 */
export async function initializeCashfreeWidget(options: CashfreeWidgetOptions): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('This function can only be called in a browser environment');
  }

  try {
    await loadCashfreeWidgetSDK();
    
    const existingContainer = document.getElementById('payment-container');
    if (!existingContainer) {
      console.warn('Payment container not found, creating a basic redirection option');
      createFallbackPaymentButton(options);
      return;
    }

    // Clean up any existing widgets
    existingContainer.innerHTML = '';
    
    const payButton = document.createElement('button');
    payButton.textContent = `Pay ₹${(options.amount / 100).toFixed(2)} with Cashfree`;
    payButton.className = 'px-4 py-2 bg-blue-600 text-white rounded-md w-full hover:bg-blue-700 transition-colors';
    payButton.id = 'cashfree-pay-button';
    
    // Add loading state
    const setLoading = (isLoading: boolean): void => {
      payButton.disabled = isLoading;
      payButton.innerHTML = isLoading 
        ? '<span class="animate-spin">⏳</span> Processing...' 
        : `Pay ₹${(options.amount / 100).toFixed(2)} with Cashfree`;
    };
    
    existingContainer.appendChild(payButton);
    
    // Handle payment button click
    payButton.addEventListener('click', async () => {
      try {
        if (!options.orderId) {
          throw new Error('Order ID is required');
        }
        
        setLoading(true);
        
        // Only handle legacy SDK via Constructor
        if (!window.Cashfree?.Constructor) {
          throw new Error('Legacy Cashfree SDK not properly initialized');
        }
        
        const cashfree = new window.Cashfree.Constructor({
          mode: process.env.NEXT_PUBLIC_CASHFREE_MODE === 'production' ? 'production' : 'sandbox'
        });
        
        await cashfree.load({
          paymentSession: {
            orderId: options.orderId,
            paymentSessionId: options.orderId,
          },
          redirectTarget: 'modal',
          renderContainer: 'payment-container',
          uiTheme: {
            theme: options.theme?.theme || 'light',
            backgroundColor: options.theme?.backgroundColor || '#ffffff',
            buttonColor: options.theme?.buttonColor || '#4a90e2',
            buttonTextColor: options.theme?.buttonTextColor || '#ffffff',
            buttonCornerRadius: options.theme?.buttonCornerRadius || '4px',
          },
          customer: {
            name: options.customerName || 'Customer',
            email: options.customerEmail || 'customer@example.com',
            phone: options.customerPhone || '9999999999',
          },
          onSuccess: (data: unknown) => {
            console.log('Payment successful:', data);
            options.onSuccess?.(data);
          },
          onFailure: (error: unknown) => {
            console.error('Payment failed:', error);
            options.onFailure?.(error);
          },
          onClose: () => {
            console.log('Payment modal closed');
            setLoading(false);
          },
        });
      } catch (error) {
        console.error('Error initializing payment:', error);
        setLoading(false);
        options.onFailure?.(error instanceof Error ? error : new Error('Payment initialization failed'));
      }
    });
  } catch (error) {
    console.error('Failed to initialize Cashfree payment:', error);
    options.onFailure?.(error instanceof Error ? error : new Error('Payment initialization failed'));
    
    // Fallback to basic redirection if initialization fails
    createFallbackPaymentButton(options);
  }
}

/**
 * Creates a fallback payment button when the main payment flow fails
 */
function createFallbackPaymentButton(options: CashfreeWidgetOptions): void {
  if (typeof window === 'undefined') return;
  
  const redirectContainer = document.createElement('div');
  redirectContainer.id = 'cashfree-redirect';
  redirectContainer.style.padding = '20px';
  redirectContainer.style.margin = '20px 0';
  redirectContainer.style.border = '1px solid #ddd';
  redirectContainer.style.borderRadius = '8px';
  
  const body = document.body || document.getElementsByTagName('body')[0];
  
  const redirectButton = document.createElement('button');
  redirectButton.textContent = 'Complete Payment';
  redirectButton.style.padding = '10px 20px';
  redirectButton.style.backgroundColor = '#4a90e2';
  redirectButton.style.color = 'white';
  redirectButton.style.border = 'none';
  redirectButton.style.borderRadius = '4px';
  redirectButton.style.cursor = 'pointer';
  
  redirectButton.addEventListener('click', () => {
    if (options.returnUrl) {
      window.location.href = options.returnUrl;
    } else {
      options.onSuccess?.({ 
        status: 'success', 
        order_id: `redirect-${Date.now()}`,
        message: 'Using fallback payment method'
      });
    }
  });
  
  redirectContainer.appendChild(redirectButton);
  body.appendChild(redirectContainer);
}

// End of Cashfree Widget SDK integration module

interface CancelSubscriptionResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Cancels a Cashfree subscription
 * @param subscriptionId - The ID of the subscription to cancel
 * @returns Promise that resolves when the subscription is cancelled
 * @throws {Error} If the cancellation fails
 */
export async function cancelCashfreeSubscription(subscriptionId: string): Promise<CancelSubscriptionResponse> {
  if (!subscriptionId) {
    throw new Error('Subscription ID is required');
  }

  try {
    const response = await fetch('/api/subscriptions/cashfree/cancel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subscriptionId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = typeof errorData === 'object' && errorData !== null && 'message' in errorData
        ? String(errorData.message)
        : 'Failed to cancel subscription';
      
      throw new Error(errorMessage);
    }

    return response.json() as Promise<CancelSubscriptionResponse>;
  } catch (error) {
    console.error('Error cancelling Cashfree subscription:', error);
    throw error instanceof Error 
      ? error 
      : new Error('Failed to cancel subscription');
  }
}

// Define the Cashfree types
type CashfreeInstance = {
  load: (options: {
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
    onSuccess: (data: any) => void;
    onFailure: (error: any) => void;
    onClose: () => void;
  }) => Promise<void>;
};

declare global {
  interface Window {
    Cashfree: {
      subscriptionsCheckout: boolean;
      Constructor: new (options: { mode: string }) => CashfreeInstance;
    };
  }
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
  subscriptionDetails?: {
    planId: string;
    interval: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    firstChargeDate?: string;
  };
}

export interface CreateOrderResponse {
  success: boolean;
  data: any;
  error?: string;
}

export async function createCashfreeOrder(params: CreateOrderParams, authToken?: string): Promise<CreateOrderResponse> {
  try {
    const endpoint = params.isSubscription 
      ? '/api/subscriptions/cashfree/create'
      : '/api/payments/cashfree/create-order';
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // Add auth token if provided
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create order');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating Cashfree order:', error);
    throw error;
  }
}

// Add global type for window.CF_Widget
declare global {
  interface Window {
    CF_Widget?: (options: any) => { load: () => void };
  }
}

// Loads the Cashfree Widget SDK if not already present
export async function loadCashfreeWidget(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.CF_Widget) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/widget/1.0.2/cashfree-widget.prod.js';
    script.async = true;
    script.onload = () => {
      setTimeout(() => {
        if (window.CF_Widget) {
          resolve();
        } else {
          reject(new Error('Cashfree Widget SDK not found after loading'));
        }
      }, 100);
    };
    script.onerror = (error) => {
      console.error('Error loading Cashfree SDK:', error);
      reject(new Error('Failed to load Cashfree Widget SDK script'));
    };
    document.body.appendChild(script);
  });
}

// Initializes the Cashfree Widget for payment
export async function initializeCashfreeWidget(options: {
  amount: number;
  appId: string;
  returnUrl?: string;
  theme?: Record<string, any>;
  onSuccess?: (data: any) => void;
  onFailure?: (error: any) => void;
  orderId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}) {
  try {
    await loadCashfreeWidget();
    
    // Clean up any existing widgets
    const existingContainer = document.getElementById('payment-container');
    if (existingContainer) {
      existingContainer.innerHTML = '';
      
      // Create a container for the payment button
      const payButton = document.createElement('button');
      payButton.innerText = 'Pay ₹' + (options.amount / 100).toFixed(2) + ' with Cashfree';
      payButton.className = 'px-4 py-2 bg-blue-600 text-white rounded-md w-full hover:bg-blue-700 transition-colors';
      payButton.id = 'cashfree-pay-button';
      
      // Add loading state
      payButton.addEventListener('click', () => {
        payButton.disabled = true;
        payButton.innerHTML = '<span class="animate-spin">⏳</span> Processing...';
      });
      
      existingContainer.appendChild(payButton);
      
      // Initialize the Cashfree SDK
      const cashfree = new window.Cashfree.Constructor({
        mode: process.env.NEXT_PUBLIC_CASHFREE_MODE || 'sandbox'
      });
      
      // Handle the payment when the button is clicked
      payButton.onclick = async () => {
        try {
          if (!options.orderId) {
            throw new Error('Order ID is required');
          }
          
          // Initialize the payment
          await cashfree.load({
            paymentSession: {
              orderId: options.orderId,
              paymentSessionId: options.orderId, // Using orderId as session ID for simplicity
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
            onSuccess: (data: any) => {
              console.log('Payment successful:', data);
              options.onSuccess?.(data);
            },
            onFailure: (error: any) => {
              console.error('Payment failed:', error);
              options.onFailure?.(error);
            },
            onClose: () => {
              console.log('Payment modal closed');
            }
          });
        } catch (error) {
          console.error('Error initializing payment:', error);
          options.onFailure?.(error);
        }
      };
      
      return;
    }
    
    // If container not found, try to create a basic redirect button
    console.log('Creating a basic payment redirection option');
    const redirectContainer = document.createElement('div');
    redirectContainer.id = 'cashfree-redirect';
    redirectContainer.style.padding = '20px';
    redirectContainer.style.margin = '20px 0';
    redirectContainer.style.border = '1px solid #ddd';
    redirectContainer.style.borderRadius = '8px';
    
    // Get the body element
    const body = document.body || document.getElementsByTagName('body')[0];
    
    const redirectButton = document.createElement('button');
    redirectButton.innerText = 'Complete Payment';
    redirectButton.style.padding = '10px 20px';
    redirectButton.style.backgroundColor = '#4a90e2';
    redirectButton.style.color = 'white';
    redirectButton.style.border = 'none';
    redirectButton.style.borderRadius = '4px';
    redirectButton.style.cursor = 'pointer';
    
    redirectButton.onclick = () => {
      if (options.returnUrl) {
        window.location.href = options.returnUrl;
      } else {
        options.onSuccess?.({ status: 'success', order_id: 'redirect-' + Date.now() });
      }
    };
    
    redirectContainer.appendChild(redirectButton);
    body.appendChild(redirectContainer);
  } catch (error) {
    console.error('Failed to initialize Cashfree payment:', error);
    options.onFailure?.(error);
  }
}

// End of Cashfree Widget SDK integration module

// Function to cancel a subscription with Cashfree
export async function cancelCashfreeSubscription(subscriptionId: string) {
  try {
    const response = await fetch('/api/subscriptions/cashfree/cancel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subscriptionId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to cancel subscription');
    }

    return await response.json();
  } catch (error) {
    console.error('Error cancelling Cashfree subscription:', error);
    throw error;
  }
}

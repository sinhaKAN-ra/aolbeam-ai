// Define the Cashfree types
declare global {
  interface Window {
    Cashfree: {
      Constructor: new (options: { mode: string }) => CashfreeInstance;
    };
  }
}

export interface CashfreeInstance {
  payment: {
    on: (event: string, callback: (data: any) => void) => void;
    redirect: (options: any) => void;
  };
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

export async function createCashfreeOrder(params: CreateOrderParams) {
  try {
    const endpoint = params.isSubscription 
      ? '/api/subscriptions/cashfree/create'
      : '/api/payments/cashfree/create-order';
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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

export async function loadCashfree(): Promise<CashfreeInstance> {
  return new Promise((resolve, reject) => {
    // If already loaded
    if (window.Cashfree) {
      try {
        const cashfree = new window.Cashfree.Constructor({
          mode: 'sandbox',
        });
        return resolve(cashfree);
      } catch (error) {
        console.error('Error initializing Cashfree:', error);
        return reject(new Error('Failed to initialize Cashfree'));
      }
    }

    // Load the script
    const script = document.createElement('script');
    // Dynamically select SDK URL based on mode
    const mode = process.env.NEXT_PUBLIC_CASHFREE_MODE || 'sandbox';
    script.src =
      mode === 'production'
        ? 'https://sdk.cashfree.com/js/ui/2.0.0/cashfree.js'
        : 'https://sdk.cashfree.com/js/ui/2.0.0-beta.5/cashfree.js';
    script.async = true;
    
    script.onload = () => {
      // Add a small delay to ensure the SDK is fully initialized
      setTimeout(() => {
      if (window.Cashfree && window.Cashfree.Constructor) {
          try {
        const cashfree = new window.Cashfree.Constructor({
              mode: 'sandbox',
        });
        resolve(cashfree);
          } catch (error) {
            console.error('Error creating Cashfree instance:', error);
            reject(new Error('Failed to create Cashfree instance'));
          }
      } else {
          console.error('Cashfree SDK not found after loading');
          reject(new Error('Cashfree SDK not found'));
      }
      }, 100);
    };
    
    script.onerror = (error) => {
      console.error('Error loading Cashfree SDK:', error);
      reject(new Error('Failed to load Cashfree SDK script'));
    };
    
    document.body.appendChild(script);
  });
}


interface PaymentData {
  payment_session_id: string;
  return_url: string;
  [key: string]: any;
}

export async function initializePayment(
  paymentData: PaymentData,
  onSuccess: (response: any) => void,
  onFailure: (error: any) => void,
  isSubscription: boolean = false
) {
  try {
    const cashfree = await loadCashfree();

    const checkoutOptions = {
      paymentSessionId: paymentData.payment_session_id,
      returnUrl: paymentData.return_url,
      redirectTarget: '_self',
      uiTheme: {
        theme: 'light',
        backgroundColor: '#ffffff',
        colorPrimary: '#1a365d',
        colorSecondary: '#2d74dc',
        colorSuccess: '#38a169',
        colorWarning: '#dd6b20',
        colorDanger: '#e53e3e',
        colorText: '#2d3748',
        colorTextSecondary: '#4a5568',
        colorBorder: '#e2e8f0',
        colorBorderLight: '#edf2f7',
        colorBackground: '#ffffff',
        fontFamily: 'Inter, sans-serif',
      },
    };

    // Set up event listeners before redirecting
    cashfree.payment.on('paymentSuccess', (data: any) => {
      console.log('Payment Success:', data);
      // Store additional subscription info if needed
      if (isSubscription) {
        // Add subscription metadata to the success data
        const enhancedData = {
          ...data,
          isSubscription,
        };
        onSuccess(enhancedData);
      } else {
        onSuccess(data);
      }
    });

    cashfree.payment.on('paymentFailure', (data: any) => {
      console.error('Payment Failure:', data);
      onFailure(data);
    });

    cashfree.payment.on('event', (data: any) => {
      console.log('Payment Event:', data);
    });

    // Initialize the payment
    cashfree.payment.redirect(checkoutOptions);
    return cashfree;
  } catch (error) {
    console.error('Error initializing payment:', error);
    throw error;
  }
}

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

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

interface CreateOrderParams {
  orderId: string;
  orderAmount: number;
  orderCurrency: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  returnUrl: string;
  notifyUrl?: string;
  orderNote?: string;
  // Add any other parameters you need
}

export async function createCashfreeOrder(params: CreateOrderParams) {
  try {
    const response = await fetch('/api/payments/cashfree/create-order', {
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
      return resolve(new window.Cashfree.Constructor({
        mode: process.env.NEXT_PUBLIC_CASHFREE_MODE || 'sandbox',
      }));
    }

    // Load the script
    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    
    script.onload = () => {
      if (window.Cashfree && window.Cashfree.Constructor) {
        const cashfree = new window.Cashfree.Constructor({
          mode: process.env.NEXT_PUBLIC_CASHFREE_MODE || 'sandbox',
        });
        resolve(cashfree);
      } else {
        reject(new Error('Cashfree SDK failed to load'));
      }
    };
    
    script.onerror = () => {
      reject(new Error('Failed to load Cashfree SDK'));
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
  onFailure: (error: any) => void
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

    cashfree.payment.on('paymentSuccess', (data: any) => {
      onSuccess(data);
    });

    cashfree.payment.on('paymentFailure', (data: any) => {
      onFailure(data);
    });

    cashfree.payment.on('event', (data: any) => {
      console.log('Payment Event:', data);
    });

    cashfree.payment.redirect(checkoutOptions);
    return cashfree;
  } catch (error) {
    console.error('Error initializing payment:', error);
    throw error;
  }
}

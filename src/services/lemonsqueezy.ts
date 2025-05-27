declare global {
  interface Window {
    createLemonSqueezy: () => void;
    LemonSqueezy: {
      Setup: ({ eventHandler }: { eventHandler: (event: any) => void }) => void;
      Url: {
        Open: (url: string) => void;
      };
    };
  }
}

interface LemonSqueezyOrderAttributes {
  store_id: number;
  customer_id: number;
  identifier: string;
  order_number: number;
  status: string;
  status_formatted: string;
  total: number;
  total_formatted: string;
  currency: string;
  currency_rate: string;
  created_at: string;
  updated_at: string;
  test_mode: boolean;
  user_email: string;
  user_name: string;
  urls: {
    receipt: string;
  };
}

interface LemonSqueezyOrderData {
  type: string;
  id: string;
  attributes: LemonSqueezyOrderAttributes;
}

interface LemonSqueezyOrder {
  meta: {
    test_mode: boolean;
  };
  data: LemonSqueezyOrderData;
}

interface LemonSqueezyVariant {
  id: string;
  name: string;
  price: number;
  status: string;
}

interface LemonSqueezyCheckoutData {
  order: LemonSqueezyOrder;
  variant: LemonSqueezyVariant;
  customer: {
    id: string;
    email: string;
    name: string;
  };
}

export async function loadLemonSqueezy(): Promise<void> {
  return new Promise((resolve, reject) => {
    // If already loaded
    if (window.LemonSqueezy) {
      return resolve();
    }

    // Load the script
    const script = document.createElement('script');
    script.src = 'https://app.lemonsqueezy.com/js/lemon.js';
    script.async = true;
    
    script.onload = () => {
      if (window.createLemonSqueezy) {
        window.createLemonSqueezy();
        resolve();
      } else {
        reject(new Error('Lemon Squeezy SDK failed to load'));
      }
    };
    
    script.onerror = (error) => {
      console.error('Error loading Lemon Squeezy SDK:', error);
      reject(new Error('Failed to load Lemon Squeezy SDK'));
    };
    
    document.body.appendChild(script);
  });
}

export function initializeLemonSqueezy(onSuccess: (data: LemonSqueezyCheckoutData) => void) {
  if (!window.LemonSqueezy) {
    throw new Error('Lemon Squeezy SDK not loaded');
  }

  window.LemonSqueezy.Setup({
    eventHandler: (event) => {
      console.log('Lemon Squeezy event:', event);
      
      // Handle the Checkout.Success event
      if (event.event === 'Checkout.Success') {
        onSuccess(event.data);
      }
      // Ignore MetaMask events
      else if (event.target === 'metamask-inpage') {
        return;
      }
      // Log other events for debugging
      else {
        console.log('Unhandled event:', event);
      }
    },
  });
}

export function openCheckout(checkoutUrl: string) {
  if (!window.LemonSqueezy) {
    throw new Error('Lemon Squeezy SDK not loaded');
  }

  window.LemonSqueezy.Url.Open(checkoutUrl);
} 
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

interface LemonSqueezySubscriptionAttributes {
  store_id: number;
  customer_id: number;
  order_id: number;
  order_item_id: number;
  product_id: number;
  variant_id: number;
  product_name: string;
  variant_name: string;
  status: string;
  status_formatted: string;
  card_brand: string;
  card_last_four: string;
  pause: null | {
    mode: string;
    resumes_at: string;
  };
  cancelled: boolean;
  trial_ends_at: string | null;
  billing_anchor: number;
  urls: {
    customer_portal: string;
    update_payment_method: string;
  };
  renews_at: string;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
  test_mode: boolean;
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

interface LemonSqueezySubscriptionData {
  type: string;
  id: string;
  attributes: LemonSqueezySubscriptionAttributes;
}

interface LemonSqueezySubscription {
  meta: {
    test_mode: boolean;
  };
  data: LemonSqueezySubscriptionData;
}

interface LemonSqueezyCheckoutData {
  order: LemonSqueezyOrder;
  variant: LemonSqueezyVariant;
  subscription?: LemonSqueezySubscription;
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

// API functions for LemonSqueezy subscriptions
export async function getLemonSqueezySubscription(subscriptionId: string) {
  try {
    const response = await fetch(`/api/subscriptions/lemonsqueezy/${subscriptionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch subscription');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching LemonSqueezy subscription:', error);
    throw error;
  }
}

export async function cancelLemonSqueezySubscription(subscriptionId: string) {
  try {
    const response = await fetch(`/api/subscriptions/lemonsqueezy/cancel`, {
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
    console.error('Error cancelling LemonSqueezy subscription:', error);
    throw error;
  }
}

export async function pauseLemonSqueezySubscription(subscriptionId: string, resumeDate?: Date) {
  try {
    const response = await fetch(`/api/subscriptions/lemonsqueezy/pause`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subscriptionId, resumeDate }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to pause subscription');
    }

    return await response.json();
  } catch (error) {
    console.error('Error pausing LemonSqueezy subscription:', error);
    throw error;
  }
}

export async function resumeLemonSqueezySubscription(subscriptionId: string) {
  try {
    const response = await fetch(`/api/subscriptions/lemonsqueezy/resume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subscriptionId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to resume subscription');
    }

    return await response.json();
  } catch (error) {
    console.error('Error resuming LemonSqueezy subscription:', error);
    throw error;
  }
} 
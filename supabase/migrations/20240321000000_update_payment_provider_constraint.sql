-- Drop the existing check constraint
ALTER TABLE payment_orders DROP CONSTRAINT IF EXISTS payment_orders_payment_provider_check;

-- Add the new check constraint with 'lemonsqueezy' included
ALTER TABLE payment_orders ADD CONSTRAINT payment_orders_payment_provider_check 
  CHECK (payment_provider IN ('cashfree', 'paypal', 'lemonsqueezy'));

-- Update the comment to reflect the change
COMMENT ON TABLE payment_orders IS 'Stores payment order information for Cashfree, PayPal, and Lemon Squeezy transactions'; 
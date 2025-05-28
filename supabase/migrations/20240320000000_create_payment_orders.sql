-- Create payment_orders table
CREATE TABLE IF NOT EXISTS payment_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL,
    payment_provider TEXT NOT NULL CHECK (payment_provider IN ('cashfree', 'paypal')),
    provider_order_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(provider_order_id, payment_provider)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS payment_orders_user_id_idx ON payment_orders(user_id);
CREATE INDEX IF NOT EXISTS payment_orders_provider_order_id_idx ON payment_orders(provider_order_id);
CREATE INDEX IF NOT EXISTS payment_orders_status_idx ON payment_orders(status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_payment_orders_updated_at
    BEFORE UPDATE ON payment_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS (Row Level Security) policies
ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view their own orders
CREATE POLICY "Users can view their own orders"
    ON payment_orders
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy to allow users to insert their own orders
CREATE POLICY "Users can insert their own orders"
    ON payment_orders
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own orders
CREATE POLICY "Users can update their own orders"
    ON payment_orders
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Add comment to table
COMMENT ON TABLE payment_orders IS 'Stores payment order information for both Cashfree and PayPal transactions'; 
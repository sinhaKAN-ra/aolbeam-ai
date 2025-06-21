-- Enable the uuid-ossp extension for uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_interactions table
CREATE TABLE IF NOT EXISTS public.user_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL, -- 'evaluate' or 'insight'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_date DATE GENERATED ALWAYS AS (created_at::date) STORED,
  UNIQUE(user_id, interaction_type, created_date)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON public.user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_created_at ON public.user_interactions(created_at);

-- Create a function to check interaction limits
CREATE OR REPLACE FUNCTION public.check_interaction_limit(
  p_user_id UUID,
  p_interaction_type TEXT
) 
RETURNS BOOLEAN 
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
  v_limit INTEGER := 5; -- Default limit for free tier
  v_has_subscription BOOLEAN;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Check if user has an active subscription
  SELECT EXISTS (
    SELECT 1 
    FROM public.subscriptions
    WHERE user_id = p_user_id 
    AND status = 'active'
    AND (ends_at IS NULL OR ends_at > CURRENT_TIMESTAMP)
  ) INTO v_has_subscription;

  -- If user has subscription, they have unlimited interactions
  IF v_has_subscription THEN
    RETURN TRUE;
  END IF;

  -- Count interactions for today
  SELECT COUNT(*) 
  INTO v_count
  FROM public.user_interactions
  WHERE user_id = p_user_id 
  AND interaction_type = p_interaction_type
  AND created_date = v_today;

  -- Return TRUE if under limit, FALSE otherwise
  RETURN v_count < v_limit;
END;
$$ LANGUAGE plpgsql;

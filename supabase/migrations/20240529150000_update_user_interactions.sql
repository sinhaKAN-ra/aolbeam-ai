-- Add the interaction_type column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_interactions' AND column_name = 'interaction_type') THEN
        ALTER TABLE public.user_interactions 
        ADD COLUMN interaction_type TEXT NOT NULL DEFAULT 'evaluate';
    END IF;
END
$$;

-- Add the created_date column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_interactions' AND column_name = 'created_date') THEN
        ALTER TABLE public.user_interactions 
        ADD COLUMN created_date DATE GENERATED ALWAYS AS (created_at::date) STORED;
    END IF;
END
$$;

-- Create or replace the check_interaction_limit function
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
    FROM user_subscriptions
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
  FROM user_interactions
  WHERE user_id = p_user_id 
  AND interaction_type = p_interaction_type
  AND created_date = v_today;

  -- Return TRUE if under limit, FALSE otherwise
  RETURN v_count < v_limit;
END;
$$ LANGUAGE plpgsql;

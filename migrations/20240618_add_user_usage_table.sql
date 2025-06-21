-- Create user_usage table to track feature usage
CREATE TABLE IF NOT EXISTS public.user_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_interactions_today INTEGER NOT NULL DEFAULT 0,
  tests_created INTEGER NOT NULL DEFAULT 0,
  last_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_usage_user_id ON public.user_usage(user_id);

-- Create a function to reset daily counters
CREATE OR REPLACE FUNCTION public.reset_daily_counters()
RETURNS TRIGGER AS $$
BEGIN
  -- Reset counters if it's a new day
  IF NEW.last_reset_date < CURRENT_DATE THEN
    NEW.chat_interactions_today := 0;
    NEW.last_reset_date := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to reset counters
CREATE OR REPLACE TRIGGER trigger_reset_daily_counters
BEFORE UPDATE ON public.user_usage
FOR EACH ROW
EXECUTE FUNCTION public.reset_daily_counters();

-- Enable Row Level Security
ALTER TABLE public.user_usage ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own usage" 
  ON public.user_usage
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage" 
  ON public.user_usage
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create a function to get or create user usage record
CREATE OR REPLACE FUNCTION public.get_or_create_user_usage(user_uuid UUID)
RETURNS SETOF public.user_usage AS $$
  INSERT INTO public.user_usage (user_id)
  VALUES (user_uuid)
  ON CONFLICT (user_id) 
  DO UPDATE SET user_id = EXCLUDED.user_id
  RETURNING *;
$$ LANGUAGE sql SECURITY DEFINER;

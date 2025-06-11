-- Check if test_series_shares table exists and add any missing fields or indexes if needed
DO $$ 
BEGIN
  -- Check if the table exists
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'test_series_shares') THEN
    -- Create test_series_shares table to track test series shared with users
    CREATE TABLE test_series_shares (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      test_series_id UUID NOT NULL REFERENCES test_series(id) ON DELETE CASCADE,
      shared_with_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      shared_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      shared_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (test_series_id, shared_with_id) -- Prevents duplicate shares
    );

    -- Add index for faster lookups
    CREATE INDEX idx_test_series_shares_shared_with_id ON test_series_shares(shared_with_id);
    CREATE INDEX idx_test_series_shares_test_series_id ON test_series_shares(test_series_id);

    -- Add RLS policies for security
    ALTER TABLE test_series_shares ENABLE ROW LEVEL SECURITY;

    -- Policy to allow inserting test_series_shares records (only for test series creators)
    CREATE POLICY "Users can share their test series" ON test_series_shares
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM test_series
          WHERE test_series.id = test_series_id
          AND test_series.creator_id = auth.uid()
        )
      );

    -- Policy to allow users to view test series shared with them
    CREATE POLICY "Users can view test series shared with them" ON test_series_shares
      FOR SELECT
      USING (shared_with_id = auth.uid());

    -- Policy to allow test series creators to view who they've shared with
    CREATE POLICY "Test series creators can view who they've shared with" ON test_series_shares
      FOR SELECT
      USING (
        shared_by_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM test_series
          WHERE test_series.id = test_series_id
          AND test_series.creator_id = auth.uid()
        )
      );
  END IF;
END $$;

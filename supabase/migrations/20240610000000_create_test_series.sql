-- STEP 0: Ensure uuid-ossp extension is available for uuid_generate_v4()
-- This MUST be run successfully before creating tables that use uuid_generate_v4().
-- In Supabase, you typically enable this via the "Extensions" tab in the dashboard.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

---

-- STEP 1: Create test series table
CREATE TABLE test_series (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  title TEXT NOT NULL,
  description TEXT,
  creator_id UUID NOT NULL,
  CONSTRAINT fk_creator FOREIGN KEY (creator_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT false,
  estimated_duration_minutes INTEGER,
  tags TEXT[]
);

---

-- STEP 2: Create test_series_problems table to store problems in a test series
CREATE TABLE test_series_problems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_series_id UUID NOT NULL,
  CONSTRAINT fk_test_series FOREIGN KEY (test_series_id) REFERENCES test_series(id) ON DELETE CASCADE,
  problem_statement TEXT NOT NULL,
  problem_type TEXT NOT NULL CHECK (problem_type IN ('theory', 'practical', 'conceptual', 'numerical', 'diagram_based')),
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  correct_answer TEXT,
  multiple_choice_options TEXT[],
  explanation TEXT,
  topic TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

---

-- STEP 3: Create test_series_shares table to track shared tests
CREATE TABLE test_series_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_series_id UUID NOT NULL REFERENCES test_series(id) ON DELETE CASCADE,
  shared_with_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(test_series_id, shared_with_id)
);

---

-- STEP 4: Create test_attempts table to track user attempts
CREATE TABLE test_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_series_id UUID NOT NULL REFERENCES test_series(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  total_time_seconds INTEGER,
  score FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

---

-- STEP 5: Create test_problem_responses table to store user responses to each problem
CREATE TABLE test_problem_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_attempt_id UUID NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
  test_problem_id UUID NOT NULL,
  CONSTRAINT fk_test_series_problem FOREIGN KEY (test_problem_id) REFERENCES test_series_problems(id) ON DELETE CASCADE,
  user_response TEXT,
  is_correct BOOLEAN,
  time_taken_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

---

-- STEP 6: Add indexes for performance
CREATE INDEX idx_test_series_creator ON test_series(creator_id);
CREATE INDEX idx_test_series_problems_test_series ON test_series_problems(test_series_id);
CREATE INDEX idx_test_series_shares_test_series ON test_series_shares(test_series_id);
CREATE INDEX idx_test_series_shares_shared_with ON test_series_shares(shared_with_id);
CREATE INDEX idx_test_attempts_test_series ON test_attempts(test_series_id);
CREATE INDEX idx_test_attempts_user ON test_attempts(user_id);
CREATE INDEX idx_test_problem_responses_attempt ON test_problem_responses(test_attempt_id);
CREATE INDEX idx_test_problem_responses_problem ON test_problem_responses(test_problem_id);

---

-- STEP 7: Apply Row-level security policies for test_series
ALTER TABLE test_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Test series are viewable by creator"
  ON test_series FOR SELECT
  USING (auth.uid() = creator_id);

CREATE POLICY "Public test series are viewable by everyone"
  ON test_series FOR SELECT
  USING (is_public = true);

CREATE POLICY "Test series are viewable by users they're shared with"
  ON test_series FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM test_series_shares
    WHERE test_series_id = test_series.id AND shared_with_id = auth.uid()
  ));

CREATE POLICY "Test series are editable by creator"
  ON test_series FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Test series are deletable by creator"
  ON test_series FOR DELETE
  USING (auth.uid() = creator_id);

CREATE POLICY "Test series are insertable by authenticated users"
  ON test_series FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

---

-- STEP 8: Apply Row-level security policies for test_series_problems
ALTER TABLE test_series_problems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Test problems are viewable by test series creator"
  ON test_series_problems FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM test_series
    WHERE id = test_series_problems.test_series_id AND creator_id = auth.uid()
  ));

CREATE POLICY "Test problems in public test series are viewable by everyone"
  ON test_series_problems FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM test_series
    WHERE id = test_series_problems.test_series_id AND is_public = true
  ));

CREATE POLICY "Test problems are viewable by users the test is shared with"
  ON test_series_problems FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM test_series_shares
    WHERE test_series_id = test_series_problems.test_series_id AND shared_with_id = auth.uid()
  ));

CREATE POLICY "Test problems are editable by test series creator"
  ON test_series_problems FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM test_series
    WHERE id = test_series_problems.test_series_id AND creator_id = auth.uid()
  ));

CREATE POLICY "Test problems are deletable by test series creator"
  ON test_series_problems FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM test_series
    WHERE id = test_series_problems.test_series_id AND creator_id = auth.uid()
  ));

CREATE POLICY "Test problems are insertable by test series creator"
  ON test_series_problems FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM test_series
    WHERE id = test_series_problems.test_series_id AND creator_id = auth.uid()
  ));

---

-- STEP 9: Apply Row-level security policies for test_series_shares
ALTER TABLE test_series_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Test shares are viewable by test creator or recipients"
  ON test_series_shares FOR SELECT
  USING (shared_with_id = auth.uid() OR shared_by_id = auth.uid());

CREATE POLICY "Test shares are insertable by test creator"
  ON test_series_shares FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM test_series
    WHERE id = test_series_shares.test_series_id AND creator_id = auth.uid()
  ) AND auth.uid() = shared_by_id);

CREATE POLICY "Test shares are deletable by test creator or recipients"
  ON test_series_shares FOR DELETE
  USING (shared_with_id = auth.uid() OR EXISTS (
    SELECT 1 FROM test_series
    WHERE id = test_series_shares.test_series_id AND creator_id = auth.uid()
  ));

---

-- STEP 10: Apply Row-level security policies for test_attempts
ALTER TABLE test_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Test attempts are viewable by the user who made them"
  ON test_attempts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Test attempts are viewable by the test creator"
  ON test_attempts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM test_series
    WHERE id = test_attempts.test_series_id AND creator_id = auth.uid()
  ));

CREATE POLICY "Test attempts are insertable by authenticated users"
  ON test_attempts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Test attempts are updatable by the user who made them"
  ON test_attempts FOR UPDATE
  USING (user_id = auth.uid());

---

-- STEP 11: Apply Row-level security policies for test_problem_responses
ALTER TABLE test_problem_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Test problem responses are viewable by the user who made them"
  ON test_problem_responses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM test_attempts
    WHERE id = test_problem_responses.test_attempt_id AND user_id = auth.uid()
  ));

CREATE POLICY "Test problem responses are viewable by the test creator"
  ON test_problem_responses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM test_attempts ta
    JOIN test_series ts ON ta.test_series_id = ts.id
    WHERE ta.id = test_problem_responses.test_attempt_id AND ts.creator_id = auth.uid()
  ));

CREATE POLICY "Test problem responses are insertable by the user taking the test"
  ON test_problem_responses FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM test_attempts
    WHERE id = test_problem_responses.test_attempt_id AND user_id = auth.uid()
  ));

CREATE POLICY "Test problem responses are updatable by the user who made them"
  ON test_problem_responses FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM test_attempts
    WHERE id = test_problem_responses.test_attempt_id AND user_id = auth.uid()
  ));
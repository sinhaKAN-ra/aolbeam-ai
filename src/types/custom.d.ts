import { Database } from './supabase';

export type TestProblem = Database['public']['Tables']['test_series_problems']['Row'];

export type TestSeries = Database['public']['Tables']['test_series']['Row'] & {
  test_problems: TestProblem[];
};

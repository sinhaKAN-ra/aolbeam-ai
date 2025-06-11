import { ProblemType, DifficultyLevel } from './index';
import type { User } from '@supabase/supabase-js';

export interface TestSeries {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  description: string | null;
  creator_id: string;
  is_public: boolean;
  estimated_duration_minutes: number | null;
  tags: string[] | null;
  creator?: User;
  problem_count?: number;
  test_problems?: TestProblem[]; // Include associated problems
  test_series_problems?: TestProblem[]; // Alternative name used by API
}

export interface TestProblem {
  id: string;
  test_series_id: string;
  problem_statement: string;
  problem_type: ProblemType;
  difficulty: DifficultyLevel;
  answer_format: string; // Added to align with GeneratePracticeProblemOutput
  correct_answer: string | null;
  multiple_choice_options: string[] | null;
  explanation: string | null;
  topic: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface TestSeriesShare {
  id: string;
  test_series_id: string;
  shared_with_id: string;
  shared_by_id: string;
  created_at: string;
  shared_with_user?: User;
  shared_by_user?: User;
  test_series?: TestSeries;
}

export interface TestAttempt {
  id: string;
  test_series_id: string;
  user_id: string;
  started_at: string;
  completed_at: string | null;
  total_time_seconds: number | null;
  score: number | null;
  created_at: string;
  updated_at: string;
  test_series?: TestSeries;
  user_profiles?: { full_name: string }; // Updated to reflect the API's returned user_profiles data
  responses?: TestProblemResponse[];
}

export interface TestProblemResponse {
  id: string;
  test_attempt_id: string;
  test_problem_id: string;
  user_response: string | null;
  is_correct: boolean | null;
  time_taken_seconds: number | null;
  created_at: string;
  updated_at: string;
  problem?: TestProblem;
}

export interface TestSummary {
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  unanswered: number;
  totalTimeTaken: number;
  averageTimePerQuestion: number;
  score: number;
}

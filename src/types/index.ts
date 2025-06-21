
import type { GeneratePracticeProblemOutput, GeneratePracticeProblemInput } from '@/ai/flows/generate-practice-problem'; // This will now include correctAnswer
import type { EvaluateTheoryAnswerOutput } from '@/ai/flows/evaluate-theory-answer';

export type ProblemType = 'theory' | 'practical' | 'practical_mcq' | 'conceptual' | 'numerical' | 'diagram_based';
export type AIGeneratedProblemType = 'theory' | 'practical' | 'practical_mcq' | 'conceptual' | 'numerical' | 'diagram_based';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface InteractionHistoryItem {
  id: string; // Local/localStorage React key
  supabase_id?: string; // ID from the Supabase database table
  timestamp: string;
  topic: string;
  problemType: ProblemType; // This can be 'random' if the user selected it, but the problem itself will be of a concrete type
  actualProblemType?: Exclude<ProblemType, 'random'>; // The actual problem type generated when 'random' is selected
  difficulty: DifficultyLevel;
  problem: GeneratePracticeProblemOutput; // This will contain the actual problem type generated
  userAnswer?: string; // For theory
  selectedOption?: string; // For practical
  evaluation?: EvaluateTheoryAnswerOutput;
  isTopicRevised?: boolean;
  topicDetails?: string | null;
  feedbackRating?: string; // e.g., "good", "unclear", "incorrect_ans", "irrelevant"
  feedbackComment?: string; // Optional user comment
  timeTakenSeconds?: number; // Time taken to solve the problem in seconds
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: string; // e.g., '₹249' or '$10'
  currency: string; // e.g., 'INR', 'USD' - Crucial for payments
  duration?: string; // e.g., '/ week', '/ month', '/ 3 months'
  interval_type?: 'day' | 'week' | 'month' | 'year';
  interval_count?: number;
  order: number; // Essential for upgrade/downgrade logic
  features: string[];
  highlight?: boolean;
  type: 'subscription' | 'one_time' | 'free'; // Distinguishes plan categories
  description?: string; // A general description of the plan
  chat_limit?: number; // Maximum chat interactions for the plan
  test_creation_limit?: number; // Maximum test creations for the plan
}

export interface UserProfile {
  id: string; // Corresponds to auth.users.id
  email: string;
  full_name: string;
  is_subscribed: boolean;
  subscription_plan_id?: string | null;
  subscription_started_at?: string | null; // ISO date string
  subscription_ends_at?: string | null; // ISO date string
  interaction_count: number;
  updated_at?: string;
  created_at?: string;

}

// This type is derived from the Zod schema in generate-practice-problem.ts
export type { GeneratePracticeProblemInput, GeneratePracticeProblemOutput };
export type { EvaluateTheoryAnswerOutput };

// Test series types
export type {
  TestSeries,
  TestProblem,
  TestSeriesShare,
  TestAttempt,
  TestProblemResponse,
  TestSummary
} from './testTypes';



import type { GeneratePracticeProblemOutput, GeneratePracticeProblemInput } from '@/ai/flows/generate-practice-problem'; // This will now include correctAnswer
import type { EvaluateTheoryAnswerOutput } from '@/ai/flows/evaluate-theory-answer';

export type ProblemType = 'theory' | 'practical' | 'conceptual' | 'numerical' | 'diagram_based';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface InteractionHistoryItem {
  id: string; // Local/localStorage React key
  supabase_id?: string; // ID from the Supabase database table
  timestamp: string;
  topic: string;
  problemType: ProblemType;
  difficulty: DifficultyLevel;
  problem: GeneratePracticeProblemOutput;
  userAnswer?: string; // For theory
  selectedOption?: string; // For practical
  evaluation?: EvaluateTheoryAnswerOutput | { isCorrect: boolean; feedback: string };
  isTopicRevised?: boolean;
  topicDetails?: string | null;
  feedbackRating?: string; // e.g., "good", "unclear", "incorrect_ans", "irrelevant"
  feedbackComment?: string; // Optional user comment
  timeTakenSeconds?: number; // Time taken to solve the problem in seconds
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  duration: string;
  features: string[];
  highlight?: boolean;
}

export interface UserProfile {
  id: string; // Corresponds to auth.users.id
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

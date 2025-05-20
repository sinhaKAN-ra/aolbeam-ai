
import type { GeneratePracticeProblemOutput } from '@/ai/flows/generate-practice-problem'; // This will now include correctAnswer
import type { EvaluateTheoryAnswerOutput } from '@/ai/flows/evaluate-theory-answer';

export type ProblemType = 'theory' | 'practical';

export interface InteractionHistoryItem {
  id: string; // Local/localStorage React key
  supabase_id?: string; // ID from the Supabase database table
  timestamp: string;
  topic: string;
  problemType: ProblemType;
  problem: GeneratePracticeProblemOutput; // This type now includes 'correctAnswer'
  userAnswer?: string; // For theory
  selectedOption?: string; // For practical
  evaluation?: EvaluateTheoryAnswerOutput | { isCorrect: boolean; feedback: string };
  isTopicRevised?: boolean;
  topicDetails?: string | null;
  feedbackRating?: string; // e.g., "good", "unclear", "incorrect_ans", "irrelevant"
  feedbackComment?: string; // Optional user comment
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  duration: string;
  features: string[];
  highlight?: boolean;
}

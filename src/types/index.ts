import type { GeneratePracticeProblemOutput } from '@/ai/flows/generate-practice-problem';
import type { EvaluateTheoryAnswerOutput } from '@/ai/flows/evaluate-theory-answer';

export type ProblemType = 'theory' | 'practical';

export interface InteractionHistoryItem {
  id: string;
  timestamp: string;
  topic: string;
  problemType: ProblemType;
  problem: GeneratePracticeProblemOutput;
  userAnswer?: string; // For theory
  selectedOption?: string; // For practical
  evaluation?: EvaluateTheoryAnswerOutput | { isCorrect: boolean; feedback: string };
  isTopicRevised?: boolean;
  topicDetails?: string | null;
}

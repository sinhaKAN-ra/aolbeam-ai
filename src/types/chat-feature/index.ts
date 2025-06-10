// Message types
export type MessageSender = 'user' | 'ai';
export type MessageType = 'text' | 'learning_context' | 'practice_problem' | 'error' | 'career_advice';

export interface Message {
  id: string;
  text: string;
  sender: MessageSender;
  type: MessageType;
  timestamp: string;
  isTyping?: boolean;
  context?: string;
  problem?: {
    question: string;
    options?: string[];
    answer?: string;
    explanation?: string;
  };
  advice?: string;
  // Maintain backward compatibility
  content?: string;
  role?: 'user' | 'assistant';
  suggestions?: TopicSuggestion[];
  tags?: TopicTag[];
}

export interface TopicSuggestion {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  category: string;
  tags?: string[];
}

export interface TopicTag {
  id: string;
  name: string;
  category: string;
  color: string;
  relatedTopics: string[];
}

export interface LearningPath {
  id: string;
  mainTopic: string;
  currentStep: number;
  totalSteps: number;
  completedTopics: string[];
  suggestedTopics: TopicSuggestion[];
  isCustomPath?: boolean;
  goals?: string[];
  timeline?: string;
  createdAt?: Date;
}

export interface CustomLearningGoal {
  id: string;
  title: string;
  description: string;
  targetDate: Date;
  topics: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedHours: number;
}

export interface SearchResult {
  title: string;
  url: string;
  description: string;
  favicon: string;
}

export interface UserProfile {
  id: string;
  email: string;
  learningPaths: LearningPath[];
  searchHistory: string[];
  preferences: {
    difficulty: string;
    timeCommitment: string;
    interests: string[];
  };
  createdAt: Date;
}
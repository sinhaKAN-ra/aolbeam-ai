import React from 'react';
import { Json } from '../supabase';
import { LearningPath } from './chat-feature';

// Message types
export type MessageSender = 'user' | 'ai';
export type MessageType = 'text' | 'learning_context' | 'practice_problem' | 'practice_problems_list' | 'error' | 'career_advice';

export interface MessageResource {
  id: string;
  title: string;
  url: string;
  type: 'video' | 'article' | 'documentation' | 'tutorial';
  duration?: string;
}

// --- PATCHED FOR useChat.ts compatibility ---
export interface TopicTag {
  id: string;
  name: string;
  category: string;
  color: string;
  relatedTopics: string[];
  colorClass?: string; // PATCH: for tag color in UI
}
// --- END PATCH ---

// --- PATCHED FOR useChat.ts compatibility ---
export interface TopicSuggestion {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  category?: string;
  time?: string;
  color?: string;
  [key: string]: Json | undefined;
  tags?: string[];
  branches?: string[];
  externalLink?: string;
  keywords?: string[]; // PATCH: for tag extraction in useChat.ts
}
// --- END PATCH ---

export interface Message {
  id: string;
  text: string;
  content?: string;
  sender: MessageSender;
  type: MessageType;
  timestamp: string;
  isTyping?: boolean;
  isStreaming?: boolean;
  tags?: TopicTag[];
  resources?: MessageResource[];
  suggestions?: TopicSuggestion[];
  context?: string;
  problem?: {
    question: string;
    options?: string[];
    answer?: string;
    explanation?: string;
  };
  problems?: string[]; // For practice_problems_list type
  advice?: string;
  role?: 'user' | 'assistant';
  color?: string;
}

export interface BranchingPath {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  tags: TopicTag[];
}

export type { EnhancedMessage, EnhancedMessageContent } from './enhanced-message';
export * from './chat-history';

export interface LearningStepResource {
  id: string;
  title: string;
  url: string;
  type: 'video' | 'article' | 'documentation' | 'tutorial';
}

// export interface LearningStep {
//   id: string;
//   title: string;
//   description?: string;
//   completed?: boolean;
//   category?: string;
//   estimatedTime?: string;
//   resources?: LearningStepResource[];
//   branches?: string[];
// }

// --- PATCHED FOR useChat.ts compatibility ---
// export interface LearningPath {
//   id: string;
//   title: string;
//   description: string;
//   main_topic: string;
//   current_step: number;
//   total_steps: number;
//   steps: LearningStep[];
//   estimated_hours: number;
//   difficulty?: 'beginner' | 'intermediate' | 'advanced';
//   tags?: string[];
//   completed_topics: string[];
//   suggested_topics: TopicSuggestion[];
//   is_custom_path?: boolean;
//   goals?: string[];
//   timeline?: string;
//   created_at?: string | Date; // PATCH: allow string timestamp
//   updated_at?: string | Date; // PATCH: required by useChat.ts
// }
// --- END PATCH ---

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
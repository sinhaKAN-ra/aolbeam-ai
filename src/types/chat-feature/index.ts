import React from 'react';

// Message types
export type MessageSender = 'user' | 'ai';
export type MessageType = 'text' | 'learning_context' | 'practice_problem' | 'error' | 'career_advice';

export interface MessageResource {
  id: string;
  title: string;
  url: string;
  type: 'video' | 'article' | 'documentation' | 'tutorial';
  duration?: string;
  icon?: React.ReactNode;
}

export interface TopicTag {
  id: string;
  name: string;
  category: string;
  color: string;
  relatedTopics: string[];
}

export interface TopicSuggestion {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  category?: string;
  time?: string;
  icon?: React.ReactNode;
  color?: string;
  tags?: string[];
  branches?: string[];
  externalLink?: string;
}

export interface Message {
  id: string;
  text: string;
  content?: string;
  sender: MessageSender;
  type: MessageType;
  timestamp: string;
  isTyping?: boolean;
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
  advice?: string;
  role?: 'user' | 'assistant';
  icon?: React.ReactNode;
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

export interface EnhancedMessageContent {
  mainContent: string;
  detailedContent?: string;
  suggestions?: TopicSuggestion[];
  resources?: MessageResource[];
  branchingPaths?: BranchingPath[];
}

export interface EnhancedMessage extends Message {
  enhancedContent: EnhancedMessageContent;
}

export interface LearningStepResource {
  id: string;
  title: string;
  url: string;
  type: 'video' | 'article' | 'documentation' | 'tutorial';
}

export interface LearningStep {
  id: string;
  title: string;
  description?: string;
  completed?: boolean;
  category?: string;
  estimatedTime?: string;
  resources?: LearningStepResource[];
  branches?: string[];
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  mainTopic: string;
  currentStep: number;
  totalSteps: number;
  steps: LearningStep[];
  estimatedHours: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
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
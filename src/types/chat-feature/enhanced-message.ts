import { Message, TopicTag, TopicSuggestion } from './index';

export interface ResourceLink {
  id: string;
  title: string;
  url: string;
  type: 'video' | 'article' | 'documentation' | 'tutorial' | 'document' | 'web_page' | 'brave_search';
  icon?: string;
  duration?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

export interface BranchingPath {
  id: string;
  title: string;
  description: string;
  tags: TopicTag[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  onSelect?: (path: BranchingPath) => void;
}

export interface EnhancedMessageContent {
  mainContent: string;
  detailedContent?: string | null;
  resources?: ResourceLink[];
  branchingPaths?: BranchingPath[];
  suggestions?: TopicSuggestion[];
  codeSnippets?: Array<{
    language: string;
    code: string;
    explanation?: string;
  }>;
  practiceProblems?: { question: string; }[];
}

export interface EnhancedMessage extends Message {
  enhancedContent?: EnhancedMessageContent;
  onSuggestionClick?: (suggestion: TopicSuggestion) => void;
}

export type { TopicSuggestion, TopicTag };

import { Message, TopicTag, TopicSuggestion } from './index';

export interface ResourceLink {
  id: string;
  title: string;
  url: string;
  type: 'video' | 'article' | 'documentation' | 'tutorial';
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
}

export interface EnhancedMessageContent {
  mainContent: string;
  detailedContent?: string;
  resources?: ResourceLink[];
  branchingPaths?: BranchingPath[];
  suggestions?: TopicSuggestion[];
  codeSnippets?: Array<{
    language: string;
    code: string;
    explanation?: string;
  }>;
}

export interface EnhancedMessage extends Message {
  enhancedContent?: EnhancedMessageContent;
}

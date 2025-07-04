// Message types
export type MessageSender = 'user' | 'ai';
export type MessageType = 'text' | 'learning_context' | 'practice_problem' | 'practice_problems_list' | 'error' | 'career_advice';

export interface Message {
  id: string;
  text: string;
  sender: MessageSender;
  type: MessageType;
  timestamp: string;
  isTyping?: boolean;
  context?: string;
  problem?: PracticeProblem;
  problems?: string[]; // For practice_problems_list type
  careerAdvice?: CareerAdvice;
}

// Topic suggestion types
export interface TopicSuggestion {
  id: string;
  title: string;
  description: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  time?: string; // Renamed from timeToLearn
  tags?: string[];
  externalLink?: string;
  imageUrl?: string;
  icon?: JSX.Element; // Added icon property
  color?: string; // Added color property
  branches?: string[]; // Path branches available from this topic
  relatedTopics?: TopicSuggestion[]; // Related topics for deeper exploration
}

// Learning path types
export interface LearningStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  resources?: LearningResource[];
  order?: number;
  estimatedTime?: string;
  category?: string; // For categorizing steps into branches/paths
  branches?: string[]; // Branching options from this step
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

export interface LearningResource {
  id: string;
  title: string;
  url: string;
  type: 'article' | 'video' | 'course' | 'documentation' | 'other';
  description?: string;
  estimatedTime?: string;
  completed?: boolean;
}

export type PathType = 'skill' | 'advancement' | 'career-change';

export interface LearningPath {
  id: string;
  user_id?: string; // Added server-side
  title: string;
  description: string;
  topic: string; // The main, required topic
  main_topic: string; // Required for compatibility
  steps: LearningStep[];
  current_step: number;
  total_steps: number;
  estimated_hours?: number;
  completed_topics?: string[];
  suggested_topics?: TopicSuggestion[];
  is_custom_path: boolean;
  path_id?: string;
  path_type?: PathType; // Added to differentiate between path types
  goals?: string[];
  timeline?: string;
  is_public?: boolean;
  progress?: number;
  created_at?: Date | string;
  updated_at?: Date | string;
  order?: number;
}

// Practice problem types
export interface PracticeProblem {
  id: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  hints?: string[];
  solution?: string;
}

// Career advice types
export interface CareerAdvice {
  id: string;
  title: string;
  description: string;
  skills: string[];
  resources: LearningResource[];
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
  };
  jobTitles?: string[];
  industry?: string;
}

// Topic tag types
export interface TopicTag {
  id: string;
  name: string;
  category: string;
  relatedTopics?: string[];
  description?: string;
  icon?: string;
}

// Custom learning path types
export interface CustomLearningGoal {
  id: string;
  title: string;
  description?: string;
  targetDate?: Date | undefined;
  topics: string[];
  estimatedHours?: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  priority: 'low' | 'medium' | 'high';
}

// Search history types
export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: string;
  resultCount?: number;
}

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

// Chat context type
export interface ChatContextType {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<Message | undefined>;
  learningPath: LearningPath | null;
  searchHistory: string[];
  topicSuggestions: TopicSuggestion[];
  topicTags: TopicTag[];
  selectedTags: string[];
  handleTagClick: (tag: TopicTag) => void;
  handleCustomPathCreated: (pathId: string) => void;
}

// Props for chat components
export interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  onSendMessage: (message: string) => Promise<Message | undefined>;
  onNewChat: () => void;
  learningPath: LearningPath | null;
  searchHistory: string[];
  topicSuggestions: TopicSuggestion[];
  topicTags: TopicTag[];
  selectedTags: string[];
  onTopicTagClick: (tag: TopicTag) => void;
  onCustomPathCreated: (pathId: string) => void;
  onRetry: () => void; // Added onRetry prop
}

export interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  onRetry?: () => void;
}

export interface TopicSuggestionCardProps {
  suggestion: TopicSuggestion;
  onSelect: (suggestion: TopicSuggestion) => void;
  isSelected?: boolean;
  className?: string;
}

export interface LearningPathTrackerProps {
  learningPath: LearningPath;
  onStepComplete?: (stepId: string, completed: boolean) => void;
  onBranchSelect?: (branchId: string) => void; // Added for branch selection
  className?: string;
}

export interface CustomLearningPathModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (goals: CustomLearningGoal[]) => void;
  initialGoals?: CustomLearningGoal[];
  topic?: string;
}

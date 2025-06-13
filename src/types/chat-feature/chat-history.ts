import { Message, MessageType } from './index';

export interface ChatSession {
  id: string;
  userId: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  messages?: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  content: string;
  role: 'user' | 'assistant';
  createdAt: string;
  metadata: {
    type?: MessageType;
    [key: string]: any;
  };
}

export interface ChatHistoryState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  isLoading: boolean;
  error: string | null;
}

export const CHAT_HISTORY_STORAGE_KEY = 'aolbeam_chat_history';

// Local storage version for guest users
export interface LocalChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Array<{
    id: string;
    content: string;
    role: 'user' | 'assistant';
    timestamp: string;
    type?: MessageType;
  }>;
}

"use client"

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchBraveResources } from '@/lib/braveResources';
import type { EnhancedMessageContent, ResourceLink } from '@/types/chat-feature/enhanced-message';
import { v4 as uuidv4 } from 'uuid';
import {
  Message,
  LearningPath,
  TopicTag,
  TopicSuggestion,
  EnhancedMessage,
  MessageSender,
  MessageType,
  ChatMessage
} from '../../types/chat-feature';
import { useChatHistory } from '../useChatHistory';
import { useFeatureAccess } from '../useFeatureAccess';
import { toast } from 'sonner';
import { canGuestChat, incrementGuestChatCount, guestChatRemaining, GUEST_LIMIT } from '@/lib/guestTrial';

interface AddMessageOptions {
  saveToHistory?: boolean;
  metadata?: Record<string, any>;
}

const useChat = (userId: string | null, initialSessionId?: string | null) => {
  const [isNewSession, setIsNewSession] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [topicSuggestions, setTopicSuggestions] = useState<TopicSuggestion[]>([]);
  const [topicTags, setTopicTags] = useState<TopicTag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [expandingIds, setExpandingIds] = useState<string[]>([]);

  // Initialize chat history
  const {
    sessions,
    currentSession,
    currentSessionId,
    setCurrentSessionId,
    saveMessage: saveMessageToHistory,
    createNewSession,
    deleteSession,
    updateSessionTitle,
    refreshChatHistory,
    isLoading: historyLoading,
  } = useChatHistory(userId, initialSessionId);

  // Load search history once on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('searchHistory');
    if (savedHistory) {
      setSearchHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Reload messages only when the ACTIVE SESSION actually changes.
  // (Previously this also fired on sessions.length changes — which happen when
  // we persist a message mid-stream — overwriting the live streamed messages
  // and blanking the chat. Keyed on currentSession?.id only now.)
  const loadedSessionRef = useRef<string | null>(null);
  useEffect(() => {
    // Wait for history to finish loading before deciding "no session exists".
    // Otherwise, a requested initialSessionId that hasn't resolved yet from
    // localStorage/DB gets orphaned by an auto-created empty session —
    // "the chat is gone, I have to start again".
    if (historyLoading) return;

    const activeId = currentSession?.id ?? null;

    if (activeId && loadedSessionRef.current === activeId) {
      setIsInitialized(true);
      return;
    }

    if (currentSession?.messages) {
      const formattedMessages = currentSession.messages.map(msg => ({
        id: msg.id,
        text: msg.content,
        content: msg.metadata?.content,
        sender: msg.role as MessageSender,
        type: msg.metadata?.type || 'text',
        timestamp: msg.createdAt,
        ...(msg.metadata || {})
      }));
      loadedSessionRef.current = activeId;
      setMessages(formattedMessages);
      if (formattedMessages.length === 0) {
        setLearningPath(null);
        setIsNewSession(true);
      } else {
        setIsNewSession(false);
      }
    } else if (sessions.length === 0 && !isInitialized && !initialSessionId) {
      // Only auto-create when NO specific session was requested via the URL.
      createNewSession('New Chat');
      setIsNewSession(true);
    } else if (!activeId && !initialSessionId) {
      setMessages([]);
      setIsNewSession(false);
    }
    setIsInitialized(true);
  }, [currentSession?.id, historyLoading, initialSessionId]);

  // If an initialSessionId is provided and different, set it as the current session
  useEffect(() => {
    if (initialSessionId && sessions.some(s => s.id === initialSessionId) && currentSessionId !== initialSessionId) {
      setCurrentSessionId(initialSessionId);
    }
  }, [initialSessionId, sessions, currentSessionId, setCurrentSessionId]);

  // Save search history to localStorage when it changes
  useEffect(() => {
    if (searchHistory.length > 0) {
      localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
    }
  }, [searchHistory]);

  const updateSearchHistory = useCallback((query: string) => {
    setSearchHistory(prev => {
      const updated = [query, ...prev.filter(item => item.toLowerCase() !== query.toLowerCase())];
      return updated.slice(0, 10); // Keep only the 10 most recent searches
    });
  }, []);

  const addMessage = useCallback(async (message: Message | EnhancedMessage, options: AddMessageOptions = {}) => {
    setIsNewSession(false); // Once a message is sent, it's no longer a new session
    if (!message.id) {
      message.id = uuidv4();
    }
    if (!message.timestamp) {
      message.timestamp = new Date().toISOString();
    }

    const newMessage: Message = {
      ...message,
    };

    // For AI messages, ensure they have enhancedContent structure when needed
    if (message.sender === 'ai' && message.type === 'learning_context') {
      // Cast to EnhancedMessage to add enhancedContent
      const enhancedMessage = newMessage as unknown as EnhancedMessage;
      if (!enhancedMessage.enhancedContent) {
        enhancedMessage.enhancedContent = {
          mainContent: message.text,
          detailedContent: message.content || '',
          suggestions: [],
          branchingPaths: [],
          resources: []
        };
      }
    }

    // Save to history if needed
    if (options.saveToHistory !== false && currentSessionId) {
      console.log('Saving message to history:', { message, currentSessionId });
      try {
        await saveMessageToHistory({
          role: message.sender === 'ai' ? 'assistant' : 'user',
          content: message.text,
          metadata: {
            type: message.type,
            content: message.content,
            enhancedContent: (message as any).enhancedContent
          }
        });
        console.log('Message saved successfully');
      } catch (error) {
        console.error('Error saving message:', error);
        throw error;
      }
    } else {
      // Regular message
      if (options.saveToHistory && currentSessionId) {
        await saveMessageToHistory({
          // id: message.id,
          role: message.sender === 'ai' ? 'assistant' : 'user',
          content: message.text,
          // createdAt: message.timestamp,
          metadata: {
            type: message.type,
            content: message.content,
            ...options.metadata
          }
        });
      }
    }

    setMessages(prev => [...prev, newMessage]);
    return message.id;
  }, [currentSessionId, saveMessageToHistory]);

  /**
   * Helper function to call the Gemini API
   */
  const callGeminiAPI = useCallback(async (action: string, params: any) => {
    try {
      const response = await fetch(`/api/gemini`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, params }),
      });

      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error calling Gemini API (${action}):`, error);
      throw error;
    }
  }, []);

  /**
   * Helper function to generate random colors for tags
   */
  const getRandomColor = useCallback(() => {
    const colors = ['bg-blue-100', 'bg-green-100', 'bg-yellow-100', 'bg-purple-100', 'bg-pink-100', 'bg-indigo-100'];
    const randomIndex = Math.floor(Math.random() * colors.length);
    return colors[randomIndex];
  }, []);

  /**
   * Helper function to call the Brave Search API
   */
  const callBraveSearch = useCallback(async (query: string) => {
    try {
      const response = await fetch(`/api/brave?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Brave search failed with status: ${response.status}`);
      }

      const data = await response.json();
      return data?.web?.results ?? [];
    } catch (error) {
      console.error('Error calling Brave Search API:', error);
      throw error;
    }
  }, []);

  /**
   * Helper function to save/update a learning path
   */
  const saveLearningPath = useCallback(async (pathData: Partial<LearningPath>) => {
    try {
      if (!pathData.id) {
        pathData.id = uuidv4();
      }

      const timestamp = new Date().toISOString();
      if (!pathData.created_at) {
        pathData.created_at = timestamp;
      }

      (pathData as any).updated_at = timestamp;

      // In a real app, you'd persist this to a database
      console.log('Saving learning path:', pathData);
      setLearningPath(pathData as LearningPath);
      return pathData.id;
    } catch (error) {
      console.error('Error saving learning path:', error);
      throw error;
    }
  }, []);

  /**
   * Extract topic tags from suggestions
   */
  const extractTagsFromSuggestions = useCallback((suggestions: TopicSuggestion[]): TopicTag[] => {
    const tags: TopicTag[] = [];
    suggestions.forEach(suggestion => {
      const suggestedTags = suggestion.keywords || [];
      suggestedTags.forEach(tag => {
        if (!tags.find(t => t.name.toLowerCase() === tag.toLowerCase())) {
          tags.push({
            id: uuidv4(),
            name: tag,
            category: '',
            color: '',
            relatedTopics: [],
            colorClass: getRandomColor(),
          });
        }
      });
    });
    return tags;
  }, [getRandomColor]);

  /**
   * Helper function for deep merge of objects
   */
  const deepMerge = useCallback((target: any, source: any) => {
    if (typeof target !== 'object' || target === null) {
      return source;
    }
    
    if (typeof source !== 'object' || source === null) {
      return source;
    }

    const output = { ...target };
    
    Object.keys(source).forEach(key => {
      if (Array.isArray(source[key])) {
        // For arrays, replace the array completely
        output[key] = [...source[key]];
      } else if (typeof source[key] === 'object' && source[key] !== null) {
        // For objects, recursively deep merge
        output[key] = deepMerge(output[key] || {}, source[key]);
      } else {
        // For primitives, just replace
        output[key] = source[key];
      }
    });
    
    return output;
  }, []);

  /**
   * Updates an existing AI message with new content or enhanced content
   */
  const updateAiMessage = useCallback(
    (id: string, patch: Partial<EnhancedMessage>) => {
      // console.log('Updating message with id:', id);
      // console.log('Update patch:', JSON.stringify(patch));
      
      setMessages(prev => {
        return prev.map(m => {
          if (m.id !== id) return m;
          
          // Get the current message state for logging
          // console.log('Current message before update:', JSON.stringify(m));

          // Get the current enhanced content or initialize an empty object
          const currentEC = (m as EnhancedMessage).enhancedContent ?? {};
          
          // Create a properly deep merged version of the enhanced content
          const newEC = patch.enhancedContent ? 
            deepMerge(currentEC, patch.enhancedContent) : currentEC;

          // console.log('New enhanced content after merge:', JSON.stringify(newEC));
          
          // Create the updated message with all properties preserved
          const updatedMessage = { 
            ...m, 
            // Update text if provided in the patch
            ...(patch.text ? { text: patch.text } : {}),
            // Always update the enhanced content with the deep-merged version
            enhancedContent: newEC,
            // Update isStreaming if provided
            ...(patch.isStreaming !== undefined ? { isStreaming: patch.isStreaming } : {})
          } as Message;
          
          // console.log('Updated message:', JSON.stringify(updatedMessage));
          return updatedMessage;
        });
      });
    },
    [deepMerge],
  );

  /**
   * Sends a user message and generates an AI response
   * The AI response is generated using parallel API calls for better performance
   */
  // Import feature access hooks
  const { canUseFeature, recordFeatureUsage } = useFeatureAccess();

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // Gate: guests use a localStorage trial; logged-in users use plan limits.
    if (!userId) {
      if (!canGuestChat()) {
        toast.error('Free trial used up', {
          description: `You've used your ${GUEST_LIMIT} free messages. Sign in with Google to keep chatting.`,
          duration: 6000,
        });
        return;
      }
    } else {
      const { allowed, reason, limit } = canUseFeature('chat');
      if (!allowed) {
        toast.error(reason || 'Feature limit reached', {
          description: `You've used all ${limit ?? ''} chat interactions available in your plan.`,
          duration: 5000,
        });
        return;
      }
    }

    // Add user message
    const userMsg: Message = {
      id: uuidv4(),
      text: content,
      content,
      sender: 'user',
      type: 'text',
      timestamp: new Date().toISOString(),
    } as Message;
    setMessages(prev => [...prev, userMsg]);

    // Count the guest trial usage (logged-in usage is recorded server-side).
    if (!userId) {
      incrementGuestChatCount();
      const left = guestChatRemaining();
      if (left <= 1) {
        toast.info(
          left === 0
            ? 'That was your last free message — sign in to continue.'
            : `${left} free message left. Sign in for more.`
        );
      }
    }

    // Persist the user message
    if (currentSessionId) {
      saveMessageToHistory({ role: 'user', content, metadata: { type: 'text' } }).catch(err =>
        console.error('Failed to save user message:', err)
      );

      // Auto-title the session from its FIRST user message, so history rows
      // aren't all "New Chat". Only when this is the opening turn and the
      // session still has the default/empty title.
      const existingTitle = (currentSession?.title || '').trim().toLowerCase();
      if (messages.length === 0 && (existingTitle === '' || existingTitle === 'new chat')) {
        const title = content.trim().replace(/\s+/g, ' ').slice(0, 60);
        updateSessionTitle(currentSessionId, title || 'New Chat').catch(err =>
          console.error('Failed to auto-title session:', err)
        );
      }
    }

    // Update search history
    const updatedHistory = [content, ...searchHistory.filter(q => q !== content)].slice(0, 10);
    setSearchHistory(updatedHistory);
    localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));

    setIsLoading(true);
    setError(null);

    // Build conversation history for the model (prior turns + this one).
    const history = [...messages, userMsg].map(m => ({
      role: (m.sender === 'ai' ? 'assistant' : 'user') as 'assistant' | 'user',
      content: m.text,
    }));

    // Create the streaming AI shell
    const aiId = uuidv4();
    const aiShell: Message = {
      id: aiId,
      text: '',
      sender: 'ai',
      type: 'text',
      timestamp: new Date().toISOString(),
      isTyping: true,
    } as Message;
    setMessages(prev => [...prev, aiShell]);

    let accumulated = '';
    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      if (!response.ok) {
        if (response.status === 403) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message || 'You have reached your chat limit for today.');
        }
        throw new Error(`Chat request failed (${response.status})`);
      }
      if (!response.body) throw new Error('No response stream');

      // Parse the SSE stream and append tokens live.
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let streamErr: string | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const evt of events) {
          const lines = evt.split('\n');
          const eventType = lines.find(l => l.startsWith('event:'))?.slice(6).trim();
          const dataLine = lines.find(l => l.startsWith('data:'))?.slice(5).trim();
          if (!dataLine) continue;
          const data = JSON.parse(dataLine);
          if (eventType === 'token' && data.t) {
            accumulated += data.t;
            setMessages(prev =>
              prev.map(m => (m.id === aiId ? ({ ...m, text: accumulated, isTyping: true } as Message) : m))
            );
          } else if (eventType === 'error') {
            streamErr = data.message;
          }
        }
      }

      if (streamErr && !accumulated) throw new Error(streamErr);

      // Empty-but-successful stream (no tokens, no error) — show a clear note
      // rather than a blank bubble.
      if (!accumulated) {
        accumulated = "I couldn't generate a response just now. Please try again.";
      }

      // Finalize the message
      setMessages(prev =>
        prev.map(m => (m.id === aiId ? ({ ...m, text: accumulated, isTyping: false } as Message) : m))
      );

      // Persist the assistant message
      if (currentSessionId && accumulated) {
        await saveMessageToHistory({
          role: 'assistant',
          content: accumulated,
          metadata: { type: 'text' },
        });
      }
    } catch (e: any) {
      console.error('Error streaming AI response:', e);
      setError(e?.message || 'Failed to get AI response.');
      // Remove the empty shell if nothing streamed
      setMessages(prev =>
        accumulated
          ? prev.map(m => (m.id === aiId ? ({ ...m, isTyping: false } as Message) : m))
          : prev.filter(m => m.id !== aiId)
      );
    } finally {
      setIsLoading(false);
    }
    return aiId;
  }, [messages, searchHistory, canUseFeature, currentSessionId, saveMessageToHistory, userId, currentSession, updateSessionTitle]);
  /**
   * Phase B: lazily fetch "learning extras" (suggestions, path, resources,
   * practice problems) for an AI answer and attach them as enhancedContent.
   * This replaces the old blocking per-message dossier — the user opts in.
   */
  const expandMessage = useCallback(async (messageId: string, topic: string) => {
    if (expandingIds.includes(messageId)) return;
    setExpandingIds(prev => [...prev, messageId]);
    try {
      const res = await fetch('/api/chat/extras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });
      if (!res.ok) throw new Error(`Extras request failed (${res.status})`);
      const data = await res.json();

      const branchingPaths = (data.learningPath?.steps || []).map((step: any) => ({
        id: String(step.id),
        title: step.title,
        description: step.description,
        difficulty: step.difficulty,
        estimatedTime: step.estimatedTime,
        tags: [],
      }));

      setMessages(prev =>
        prev.map(m => {
          if (m.id !== messageId) return m;
          const enhanced = m as EnhancedMessage;
          return {
            ...enhanced,
            enhancedContent: {
              ...(enhanced.enhancedContent || {}),
              mainContent: enhanced.enhancedContent?.mainContent || m.text,
              suggestions: data.suggestions || [],
              branchingPaths,
              resources: data.resources || [],
              practiceProblems: data.practiceProblems || [],
            },
          } as Message;
        })
      );
    } catch (err) {
      console.error('Failed to expand message:', err);
      toast.error('Could not load learning extras. Please try again.');
    } finally {
      setExpandingIds(prev => prev.filter(id => id !== messageId));
    }
  }, [expandingIds]);

  const handleTopicTagClick = useCallback((tag: TopicTag) => {
    const newSelectedTags = selectedTags.includes(tag.id)
      ? selectedTags.filter(id => id !== tag.id)
      : [...selectedTags, tag.id];

    setSelectedTags(newSelectedTags);

    // If this is a new selection, send a message about it
    if (!selectedTags.includes(tag.id)) {
      sendMessage(`Tell me more about ${tag.name} in the context of what we're discussing.`);
    }
  }, [selectedTags, sendMessage]);
  

  // Helper functions for chat management
  const handleCustomPathCreated = useCallback((pathId: string) => {
    // In a real app, you might want to fetch the updated path or update local state
    console.log('Custom path created:', pathId);
    // You could also update the UI to show the new path was created
  }, []);

  const startNewChat = useCallback(() => {
    setMessages([]);
    setLearningPath(null);
    setTopicSuggestions([]);
    setTopicTags([]);
    setSelectedTags([]);
    setError(null);
    setIsLoading(false);
    setTypingMessageId(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    learningPath,
    searchHistory,
    topicSuggestions,
    topicTags,
    selectedTags,
    handleTopicTagClick,
    handleCustomPathCreated,
    startNewChat,
    isNewSession,
    expandMessage,
    expandingIds,
    // Chat-history passthroughs (sourced from useChatHistory above) so the
    // page can drive the history rail from this single hook instance.
    sessions,
    currentSessionId,
    createNewSession,
    deleteSession,
    updateSessionTitle,
  };
};

export default useChat;

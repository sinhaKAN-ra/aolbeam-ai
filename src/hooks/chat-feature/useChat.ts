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
    refreshChatHistory
  } = useChatHistory(userId, initialSessionId);

  // Load search history once on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('searchHistory');
    if (savedHistory) {
      setSearchHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Reload messages every time the current session changes
  useEffect(() => {
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
      setMessages(formattedMessages);
      if (formattedMessages.length === 0) {
        setLearningPath(null);
        setIsNewSession(true);
      } else {
        setIsNewSession(false);
      }
    } else if (sessions.length === 0 && !isInitialized) {
      // No sessions exist, create a new one (only on first load)
      createNewSession('New Chat');
      setIsNewSession(true);
    } else {
      setMessages([]);
      setIsNewSession(false);
    }
    setIsInitialized(true);
  }, [currentSession?.id, sessions.length]);

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
      const response = await fetch('/api/brave-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`Brave search failed with status: ${response.status}`);
      }

      const data = await response.json();
      return data.results;
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
    
    // Check if the user can use the chat feature
    const { allowed, reason, remaining, limit } = canUseFeature('chat');
    
    if (!allowed) {
      // Show error toast with reason
      toast.error(reason || 'Feature limit reached', {
        description: `You've used all ${limit} chat interactions available in your plan.`,
        duration: 5000,
      });
      return;
    }

    // Add user message to the chat
    const userMsg: Message = {
      id: uuidv4(),
      text: content,
      content,
      sender: 'user',
      type: 'text',
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    
    // Record feature usage
    try {
      await recordFeatureUsage('chat');
    } catch (error) {
      console.error('Failed to record chat usage:', error);
      // Continue anyway since the message was already displayed
    }

    // Update search history
    const updatedHistory = [
      content,
      ...searchHistory.filter(q => q !== content),
    ].slice(0, 10);
    setSearchHistory(updatedHistory);
    localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));

    // Set loading state
    setIsLoading(true);
    setError(null);

    try {
      // Create an empty AI message shell
      const aiId = uuidv4();
      const aiShell: EnhancedMessage = {
        id: aiId,
        text: '…', 
        sender: 'ai',
        type: 'learning_context',
        timestamp: new Date().toISOString(),
        isStreaming: true,
        enhancedContent: { mainContent: '' },
      };
      setMessages(prev => [...prev, aiShell]);

      // Make all API calls in parallel
      // console.log('Starting parallel API calls for:', content);
      let currentEnhancedContent: EnhancedMessageContent = {
        mainContent: '',
      };

      // 1. Generate Learning Context
      const contextResult = await callGeminiAPI('generateLearningContext', { prompt: content, topic: content });
      // console.log('contextResult (raw):', contextResult);
      currentEnhancedContent = {
        ...currentEnhancedContent,
        mainContent: contextResult?.text || '',
        detailedContent: null,
      };
      // console.log('mainContent assigned:', currentEnhancedContent.mainContent);
      updateAiMessage(aiId, { enhancedContent: currentEnhancedContent });

      // 2. Generate Topic Suggestions
      const suggestionsResult = await callGeminiAPI('generateTopicSuggestions', { topic: content, count: 4 });
      // console.log('suggestionsResult:', suggestionsResult);
      currentEnhancedContent = {
        ...currentEnhancedContent,
        suggestions: suggestionsResult?.suggestions || [],
      };
      updateAiMessage(aiId, { enhancedContent: currentEnhancedContent });

      // 3. Generate Learning Path
      const learningPathResult = await callGeminiAPI('generateLearningPath', { topic: content, userId: 'guest' });
      // console.log('learningPathResult (raw):', learningPathResult);
      const branchingPaths = learningPathResult?.steps?.map((step: any) => ({
        id: String(step.id),
        title: step.title,
        description: step.description,
        difficulty: step.difficulty,
        estimatedTime: step.estimatedTime,
        tags: []
      })) || [];
      currentEnhancedContent = {
        ...currentEnhancedContent,
        branchingPaths: branchingPaths,
      };
      updateAiMessage(aiId, { enhancedContent: currentEnhancedContent });
      // console.log('learningPathResult (processed):', learningPathResult);
      // console.log('Generated branchingPaths:', currentEnhancedContent.branchingPaths);

      // 4. Fetch Brave Resources
      const resourcesResult = await fetchBraveResources(content, { useCache: true });
      const resources = resourcesResult?.map((r: any, i: number) => ({
        id: `res-${i}`,
        title: r.title,
        url: r.url,
        type: (r.type as any) || 'web_page',
      })) || [];
      currentEnhancedContent = {
        ...currentEnhancedContent,
        resources: resources,
      };
      updateAiMessage(aiId, { enhancedContent: currentEnhancedContent });

      // 5. Generate Practice Problems
      const problemsResult = await callGeminiAPI('generatePracticeProblems', {
        prompt: content,
        count: 5,
      });
      currentEnhancedContent = {
        ...currentEnhancedContent,
        practiceProblems: problemsResult?.practiceProblem?.map((problem: string) => ({ question: problem })) || [],
      };
      updateAiMessage(aiId, { enhancedContent: currentEnhancedContent });

      // Final update and save
      const finalEnhancedContent = {
        ...currentEnhancedContent,
        mainContent: currentEnhancedContent.mainContent || 'No content generated.', // Ensure mainContent is not empty
      };
      
      // Update the AI message with all content at once
      // console.log('Updating AI message with complete enhanced content');
      updateAiMessage(aiId, {
        text: finalEnhancedContent.mainContent,
        enhancedContent: finalEnhancedContent,
        isStreaming: false
      });
      
      // Save the AI message to history
      if (currentSessionId) {
        await saveMessageToHistory({
          // id: aiId,
          role: 'assistant',
          content: finalEnhancedContent.mainContent,
          // createdAt: new Date().toISOString(),

          metadata: {
            type: 'learning_context',
            enhancedContent: finalEnhancedContent
          }
        });
      }
      
      // console.log('AI response generation complete');
      return aiId;
    } catch (e) {
      console.error('Error generating AI response:', e);
      setError('Failed to get AI response.');
    } finally {
      setIsLoading(false);
    }
  }, [
    searchHistory,
    setSearchHistory,
    callGeminiAPI,
    fetchBraveResources,
    extractTagsFromSuggestions,
    setTopicSuggestions,
    setTopicTags,
    updateAiMessage,
    currentSessionId,
    saveMessageToHistory
  ]);

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
  };
};

export default useChat;

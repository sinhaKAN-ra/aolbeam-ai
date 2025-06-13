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

interface AddMessageOptions {
  saveToHistory?: boolean;
  metadata?: Record<string, any>;
}

const useChat = (userId: string | null) => {
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
  } = useChatHistory(userId);

  // Initialize chat and load data
  useEffect(() => {
    // Load search history from localStorage
    const savedHistory = localStorage.getItem('searchHistory');
    if (savedHistory) {
      setSearchHistory(JSON.parse(savedHistory));
    }

    // Load messages from current session if it exists
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

      // If this is a new session, we might want to set a default learning path
      if (formattedMessages.length === 0) {
        setLearningPath(null);
      }
    } else if (sessions.length === 0) {
      // No sessions exist, create a new one
      createNewSession('New Chat');
    }

    setIsInitialized(true);
  }, [currentSession?.id, sessions.length]);

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

  const addMessage = useCallback(async (message: Message | EnhancedMessage, options: { saveToHistory?: boolean } = {}) => {
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

      // Save to history if needed
      if (options.saveToHistory !== false && currentSessionId) {
        try {
          const messageToSave: Omit<ChatMessage, 'id' | 'createdAt'> = {
            sessionId: currentSessionId,
            content: message.text,
            role: message.sender === 'ai' ? 'assistant' : 'user',
            metadata: {
              type: message.type,
              content: message.content,
              ...(message as any).metadata,
              enhancedContent: enhancedMessage.enhancedContent
            }
          };

          await saveMessageToHistory(messageToSave);
        } catch (error) {
          console.error('Failed to save message to history:', error);
        }
      }

      setMessages(prev => [...prev, enhancedMessage]);
      return enhancedMessage;
    }

    // Save to history if needed
    if (options.saveToHistory !== false && currentSessionId) {
      try {
        const messageToSave: Omit<ChatMessage, 'id' | 'createdAt'> = {
          sessionId: currentSessionId,
          content: message.text,
          role: message.sender === 'ai' ? 'assistant' : 'user',
          metadata: {
            type: message.type,
            content: message.content,
            ...(message as any).metadata
          }
        };

        await saveMessageToHistory(messageToSave);
      } catch (error) {
        console.error('Failed to save message to history:', error);
      }
    }

    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, [currentSessionId, saveMessageToHistory]);

  // Helper function to call the Gemini API
  const callGeminiAPI = async (action: string, params: any) => { // Changed 'type' to 'action' and 'payload' to 'params'
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, params }), // Changed 'type' to 'action' and 'payload' to 'params'
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error in ${action}:`, error); // Changed 'type' to 'action'
      throw error;
    }
  };

  // Helper function to call the Brave Search API
  const callBraveSearch = async (query: string) => {
    try {
      const response = await fetch('/api/brave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`Brave Search API request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Error in Brave Search:', error);
      throw error;
    }
  };

  // Helper function to save/update a learning path
  const saveLearningPath = async (pathData: Partial<LearningPath>) => {
    try {
      const method = pathData.id ? 'PUT' : 'POST';
      const url = pathData.id
        ? '/api/learning-paths'
        : '/api/learning-paths';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pathData.id ? { id: pathData.id, updates: pathData } : pathData),
      });

      if (!response.ok) {
        throw new Error(`Failed to save learning path: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error saving learning path:', error);
      throw error;
    }
  };
  const extractTagsFromSuggestions = (suggestions: TopicSuggestion[]): TopicTag[] => {
    if (!suggestions || !Array.isArray(suggestions)) return [];

    const tagMap = new Map<string, TopicTag>();

    suggestions.forEach(suggestion => {
      if (suggestion.tags && Array.isArray(suggestion.tags)) {
        suggestion.tags.forEach(tag => {
          const normalizedTag = tag.toLowerCase().trim();
          if (!tagMap.has(normalizedTag)) {
            tagMap.set(normalizedTag, {
              id: uuidv4(),
              name: tag,
              category: 'general', // Default category
              relatedTopics: [],   // Default empty array
              color: getRandomColor()
            });
          }
        });
      }
    });

    return Array.from(tagMap.values());
  };



  

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

  const getRandomColor = useCallback((): string => {
    const colors = [
      '#FF5733', '#33FF57', '#3357FF', '#F333FF', '#33FFF3', '#FF33C1', '#C1FF33', '#33C1FF', '#FFC133', '#C133FF'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }, []);

  const sendMessage = useCallback(async (content: string): Promise<Message | undefined> => {
    if (!content.trim()) return;

    const messageData: Message = {
      id: uuidv4(),
      text: content,
      content: content,
      sender: 'user',
      type: 'text',
      timestamp: new Date().toISOString()
    };

    try {
      // Add user message to the chat
      setMessages(prev => [...prev, messageData]);

      // Save to history if needed
      if (userId) {
        try {
          // Update local search history
          const updatedHistory = [content, ...searchHistory.filter(item => item !== content)].slice(0, 10);
          setSearchHistory(updatedHistory);
          localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
        } catch (historyError) {
          console.error('Failed to update search history:', historyError);
        }
      }

      // Set loading state
      setIsLoading(true);
      setError(null);

      // Add typing indicator
      const typingMessageId = uuidv4();
      setTypingMessageId(typingMessageId);

      setMessages(prev => [
        ...prev,
        {
          id: typingMessageId,
          text: '...',
          content: '...',
          sender: 'ai',
          type: 'text',
          timestamp: new Date().toISOString(),
          isTyping: true
        }
      ]);

      // Step 1: Generate initial response using Gemini API
      const contextResponse = await callGeminiAPI('generateLearningContext', { topic: content });

      const { text: context } = await contextResponse;

      // console.log('Context received:', context);

      // Remove typing indicator
      setTypingMessageId(null);
      setMessages(prev => prev.filter(msg => msg.id !== typingMessageId));

      // Step 2: Generate topic suggestions
      const response = await callGeminiAPI('generateTopicSuggestions', { topic: content, count: 4 });


      const { suggestions } = await response;

      // console.log('Topic suggestions received:', suggestions);

     
      console.log('Suggestions received:', suggestions);
      setTopicSuggestions(suggestions);

      // Build enhanced content
      const enhancedContent: EnhancedMessageContent = {
        mainContent: context,
        detailedContent: context,
        suggestions: suggestions,
        branchingPaths: [
          {
            id: 'branch-1',
            title: `${content} Fundamentals`,
            description: `Master the core concepts of ${content} with hands-on exercises and practical examples.`,
            difficulty: 'beginner',
            estimatedTime: '2-3 weeks',
            tags: []
          },
          {
            id: 'branch-2',
            title: `Advanced ${content} Techniques`,
            description: `Dive deeper into advanced ${content} concepts and professional applications.`,
            difficulty: 'intermediate',
            estimatedTime: '3-4 weeks',
            tags: []
          },
          {
            id: 'branch-3',
            title: `${content} Projects and Applications`,
            description: `Apply your knowledge through real-world projects and build your portfolio.`,
            difficulty: 'advanced',
            estimatedTime: '4-6 weeks',
            tags: []
          }
        ],
        resources: await (async () => {
          try {
            const braveResources = await fetchBraveResources(content, { useCache: true });
            return braveResources.map((resource, index) => ({
              id: `resource-${index + 1}`,
              title: resource.title,
              url: resource.url,
              type: (resource.type as any) || 'web_page',
              duration: undefined,
            }));
          } catch (error) {
            console.error('Failed to fetch Brave resources:', error);
            return [];
          }
        })(),
      };

      // Add AI's response with enhanced content
      const enhancedAiMessage = (await addMessage({
        text: context,
        sender: 'ai',
        type: 'learning_context',
        context: context,
        enhancedContent: enhancedContent,
        id: '',
        timestamp: ''
      })) as EnhancedMessage;

      // Step 3: Generate learning path
      // const pathData = await callGeminiAPI('generateLearningPath', {
      //   topic: content,
      //   userId
      // });
      // console.log('Path data:', pathData);

        // Save the learning path - ensure all required fields are included
        // const savedPath = await saveLearningPath({
        //   ...pathData,
        //   topic: content, // Add the original topic
        //   description: `Learning path for ${content}`, // Add a default description
        //   userId,
        //   createdAt: new Date().toISOString(),
        //   updatedAt: new Date().toISOString(),
        //   isPublic: false, // Default to private
        //   progress: 0,
        // });

      // if (pathData) {
      //   setLearningPath({
      //     ...pathData,
      //     id: `path-${Date.now()}`,
      //     progress: 0,
      //     isCustom: false,
      //     createdAt: new Date().toISOString()
      //   });
      // }

      // Step 4: Extract topics for tags
      const tags = extractTagsFromSuggestions(suggestions);
      setTopicTags(tags);

      // Step 5: (Optional) Generate a practice problem
      const shouldGeneratePracticeProblems = context && context.length > 0;

      if (shouldGeneratePracticeProblems) {
        try {
          const response = await callGeminiAPI('generatePracticeProblems', {
            topic: content,
            count: 3
          });

          if (!response || !response.practice_problems) {
            console.error('No practice problems in response:', response);
            // return;
          }

          const { practice_problems } = response;

          const problemsArray = Array.isArray(practice_problems)
            ? practice_problems
            : [];

          console.log('Processed problems array:', problemsArray);

          if (problemsArray.length === 0) {
            console.warn('Empty practice problems array in response');
          }

          const newMessage = {
            text: 'Here are some practice problems to test your understanding:',
            content: 'Here are some practice problems to test your understanding:',
            sender: 'ai' as const,
            type: 'practice_problems_list' as const,
            problems: problemsArray,
            metadata: {
              type: 'practice_problems_list',
              problems: problemsArray
            },
            id: '',
            timestamp: ''
          };

          console.log('New message being created:', newMessage);
          await addMessage(newMessage, { saveToHistory: true });
        } catch (error) {
          console.error('Error generating practice problem:', error);
        }
      }

      return enhancedAiMessage;
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to get response. Please try again.');

      setTypingMessageId(null);
      setMessages(prev => prev.filter(msg => msg.id !== typingMessageId));

      await addMessage({
        text: 'Sorry, I encountered an error. Please try again.',
        content: 'Sorry, I encountered an error. Please try again.',
        sender: 'ai' as const,
        type: 'error' as const,
        id: '',
        timestamp: ''
      }, { saveToHistory: false });
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [addMessage, fetchBraveResources, setMessages, setTypingMessageId, setIsLoading, setError, setTopicSuggestions, setLearningPath, extractTagsFromSuggestions, setTopicTags, userId, searchHistory, setSearchHistory]);

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
};
};

export default useChat;

"use client"

import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  Message, 
  LearningPath, 
  TopicTag, 
  TopicSuggestion, 
  EnhancedMessage,
  MessageSender,
  MessageType
} from '../../types/chat-feature';

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

  // Load search history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('searchHistory');
    if (savedHistory) {
      setSearchHistory(JSON.parse(savedHistory));
    }
  }, []);

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

  const addMessage = useCallback((message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      id: uuidv4(),
      ...message,
      timestamp: new Date().toISOString(),
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
      setMessages(prev => [...prev, enhancedMessage]);
      return enhancedMessage;
    }
    
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  // Helper function to call the Gemini API
  const callGeminiAPI = async (type: string, payload: any) => {
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, payload }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error in ${type}:`, error);
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

  const sendMessage = useCallback(async (content: string): Promise<Message | undefined> => {
    if (!content.trim()) return;

    const userMessage = addMessage({
      text: content,
      sender: 'user',
      type: 'text',
    });

    setIsLoading(true);
    setError(null);

    try {
      // Add a typing indicator
      const typingMessageId = uuidv4();
      setTypingMessageId(typingMessageId);
      setMessages(prev => [
        ...prev,
        {
          id: typingMessageId,
          text: '...',
          sender: 'ai',
          type: 'text',
          isTyping: true,
          timestamp: new Date().toISOString(),
        }
      ]);

      // Update search history
      updateSearchHistory(content);

      // Step 1: Generate initial response using Gemini API
      const { text: context } = await callGeminiAPI('generateLearningContext', { topic: content });
      
      // Remove typing indicator
      setTypingMessageId(null);
      setMessages(prev => prev.filter(msg => msg.id !== typingMessageId));

      // Step 2: Generate topic suggestions
      const { suggestions = [] } = await callGeminiAPI('generateTopicSuggestions', { 
        topic: content,
        count: 4 
      });
      setTopicSuggestions(suggestions);
      
      // Add AI's response
      const aiMessage = addMessage({
        text: context,
        sender: 'ai',
        type: 'learning_context',
        context: context,
      }) as EnhancedMessage;
      
      // Add enhanced content to the message after creation
      aiMessage.enhancedContent = {
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
        resources: [
          {
            id: 'resource-1',
            title: `${content} Documentation`,
            url: `https://example.com/${content.toLowerCase().replace(/\s+/g, '-')}-docs`,
            type: 'documentation',
            duration: '10 min read'
          },
          {
            id: 'resource-2',
            title: `${content} Tutorial: Getting Started`,
            url: `https://example.com/${content.toLowerCase().replace(/\s+/g, '-')}-tutorial`,
            type: 'tutorial',
            duration: '25 min'
          },
          {
            id: 'resource-3',
            title: `Introduction to ${content}`,
            url: `https://example.com/${content.toLowerCase().replace(/\s+/g, '-')}-video`,
            type: 'video',
            duration: '15 min watch'
          }
        ]
      };
      
      // Update the messages array with the enhanced message
      setMessages(prev => prev.map(msg => msg.id === aiMessage.id ? aiMessage : msg));

      // Step 3: Generate learning path
      const pathData = await callGeminiAPI('generateLearningPath', { 
        topic: content,
        userId 
      });
      
      // Save the learning path - ensure all required fields are included
      const savedPath = await saveLearningPath({
        ...pathData,
        topic: content, // Add the original topic
        description: `Learning path for ${content}`, // Add a default description
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isPublic: false, // Default to private
        progress: 0,
      });
      
      setLearningPath(savedPath);

      // Step 4: Extract topics for tags
      const tags = extractTagsFromSuggestions(suggestions);
      setTopicTags(tags);

      // Step 5: (Optional) Generate a practice problem
      if (Math.random() > 0.5) { // 50% chance to include a practice problem
        try {
          const { problem } = await callGeminiAPI('generatePracticeProblem', { topic: content });
          if (problem) {
            addMessage({
              text: `Here's a practice problem to test your understanding: ${problem.question}`,
              sender: 'ai',
              type: 'practice_problem',
              problem: problem,
            });
          }
        } catch (error) {
          console.error('Error generating practice problem:', error);
          // Don't fail the whole flow if practice problem generation fails
        }
      }

      return aiMessage;
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to get response. Please try again.');
      
      // Remove typing indicator if there was an error
      setTypingMessageId(null);
      setMessages(prev => prev.filter(msg => msg.id !== typingMessageId));
      
      // Add error message
      addMessage({
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'ai',
        type: 'error',
      });
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [addMessage, updateSearchHistory, userId]);

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

  const extractTagsFromSuggestions = (suggestions: TopicSuggestion[]): TopicTag[] => {
    if (!suggestions || suggestions.length === 0) return [];
    
    const allTags = new Map<string, TopicTag>();
    
    suggestions.forEach(suggestion => {
      if (suggestion.tags) {
        suggestion.tags.forEach((tagName: string) => {
          const normalizedTag = tagName.toLowerCase().trim();
          if (!allTags.has(normalizedTag)) {
            allTags.set(normalizedTag, {
              id: `tag-${normalizedTag}`,
              name: tagName,
              category: suggestion.difficulty?.toLowerCase() || 'general',
              relatedTopics: [suggestion.title]
            });
          } else {
            const existingTag = allTags.get(normalizedTag)!;
            if (suggestion.title && !existingTag.relatedTopics?.includes(suggestion.title)) {
              existingTag.relatedTopics = [...(existingTag.relatedTopics || []), suggestion.title];
            }
          }
        });
      }
    });
    
    return Array.from(allTags.values());
  };

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

  const handleCustomPathCreated = useCallback((pathId: string) => {
    // In a real app, you might want to fetch the updated path or update local state
    console.log('Custom path created:', pathId);
    // You could also update the UI to show the new path was created
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
  };
};

export default useChat;

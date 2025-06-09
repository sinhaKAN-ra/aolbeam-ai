import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message, TopicSuggestion, LearningPath, TopicTag } from '../types';
import { generateLearningPath, createCustomLearningPath } from '../services/learningPathService';
import { searchWeb } from '../services/braveService';
import { generateLearningContext, generateTopicSuggestions, generatePracticeProblem } from '../services/geminiService';

const useChat = (userId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  const sendMessage = useCallback(async (content: string) => {
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

      // Step 1: Generate initial response
      const initialResponse = await generateLearningContext(content);
      
      // Remove typing indicator
      setMessages(prev => prev.filter(msg => msg.id !== typingMessageId));

      // Add AI's response
      const aiMessage = addMessage({
        text: initialResponse,
        sender: 'ai',
        type: 'learning_context',
        context: initialResponse,
      });

      // Step 2: Generate topic suggestions
      const suggestions = await generateTopicSuggestions(content, 3);
      setTopicSuggestions(suggestions);

      // Step 3: Generate learning path
      const path = await generateLearningPath(content, userId);
      setLearningPath(path);

      // Step 4: Extract topics for tags
      const tags = extractTagsFromSuggestions(suggestions);
      setTopicTags(tags);

      // Step 5: (Optional) Generate a practice problem
      if (Math.random() > 0.5) { // 50% chance to include a practice problem
        const problem = await generatePracticeProblem(content);
        if (problem) {
          addMessage({
            text: `Here's a practice problem to test your understanding: ${problem.question}`,
            sender: 'ai',
            type: 'practice_problem',
            problem: problem,
          });
        }
      }

      return aiMessage;
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to get response. Please try again.');
      
      // Remove typing indicator if there was an error
      setMessages(prev => prev.filter(msg => msg.id !== typingMessageId));
      
      // Add error message
      addMessage({
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'ai',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [addMessage, updateSearchHistory, userId]);

  const extractTagsFromSuggestions = (suggestions: TopicSuggestion[]): TopicTag[] => {
    if (!suggestions || suggestions.length === 0) return [];
    
    const allTags = new Map<string, TopicTag>();
    
    suggestions.forEach(suggestion => {
      if (suggestion.tags) {
        suggestion.tags.forEach(tagName => {
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

  const handleTagClick = useCallback((tag: TopicTag) => {
    const newSelectedTags = selectedTags.includes(tag.id)
      ? selectedTags.filter(id => id !== tag.id)
      : [...selectedTags, tag.id];
    
    setSelectedTags(newSelectedTags);
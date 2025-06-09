import { useState, useCallback } from 'react';
import { Message, TopicSuggestion, LearningPath, TopicTag } from '../types';
import { geminiService } from '../services/geminiService';
import { learningPathService } from '../services/learningPathService';

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Extract topic from user message
      const topic = extractTopic(content);
      
      // Update search history
      setSearchHistory(prev => {
        const updated = [topic, ...prev.filter(item => item !== topic)].slice(0, 50);
        // Save to Supabase or localStorage
        learningPathService.saveSearchHistory('demo-user', topic);
        return updated;
      });
      
      // Generate learning context using Gemini
      const aiResponse = await geminiService.generateLearningContext(topic);
      
      // Generate topic suggestions with tags
      const suggestions = await geminiService.generateTopicSuggestions(topic);
      
      // Generate related tags
      const tags = generateRelatedTags(topic, suggestions);
      
      // Create AI message with suggestions and tags
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        role: 'assistant',
        timestamp: new Date(),
        suggestions,
        tags
      };

      setMessages(prev => [...prev, aiMessage]);

      // Update learning path
      updateLearningPath(topic, suggestions);

    } catch (error) {
      console.error('Error generating response:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'I apologize, but I encountered an error while processing your request. Please try again or rephrase your question.',
        role: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateLearningPath = useCallback((topic: string, suggestions: TopicSuggestion[]) => {
    setLearningPath(prev => {
      if (!prev) {
        const newPath: LearningPath = {
          id: Date.now().toString(),
          mainTopic: topic,
          currentStep: 1,
          totalSteps: 5,
          completedTopics: [],
          suggestedTopics: suggestions,
          createdAt: new Date()
        };
        
        // Save to Supabase
        learningPathService.saveLearningPath(newPath, 'demo-user');
        return newPath;
      }

      const updatedPath: LearningPath = {
        ...prev,
        mainTopic: topic,
        currentStep: Math.min(prev.currentStep + 1, prev.totalSteps),
        completedTopics: prev.mainTopic !== topic 
          ? [...prev.completedTopics, prev.mainTopic] 
          : prev.completedTopics,
        suggestedTopics: suggestions
      };

      // Save updated path
      learningPathService.saveLearningPath(updatedPath, 'demo-user');
      return updatedPath;
    });
  }, []);

  return {
    messages,
    isLoading,
    learningPath,
    searchHistory,
    sendMessage
  };
};

// Helper function to extract topic from user message
function extractTopic(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('tell me about')) {
    return message.replace(/tell me about/i, '').trim();
  }
  
  if (lowerMessage.includes('what is')) {
    return message.replace(/what is/i, '').trim().replace(/\?$/, '');
  }
  
  if (lowerMessage.includes('explain')) {
    return message.replace(/explain/i, '').trim();
  }

  if (lowerMessage.includes('explore')) {
    return message.replace(/explore/i, '').trim().replace(/in detail/i, '');
  }
  
  return message.trim();
}

// Helper function to generate related tags
function generateRelatedTags(topic: string, suggestions: TopicSuggestion[]): TopicTag[] {
  const tags: TopicTag[] = [];
  
  // Generate fundamental tags
  const fundamentalTopics = [
    `${topic} Basics`,
    `${topic} Fundamentals`,
    `Introduction to ${topic}`,
    `${topic} Concepts`
  ];

  fundamentalTopics.forEach((name, index) => {
    tags.push({
      id: `fundamental-${index}`,
      name,
      category: 'fundamental',
      color: 'primary',
      relatedTopics: suggestions.map(s => s.title)
    });
  });

  // Generate advanced tags
  const advancedTopics = [
    `Advanced ${topic}`,
    `${topic} Research`,
    `${topic} Applications`,
    `${topic} Theory`
  ];

  advancedTopics.forEach((name, index) => {
    tags.push({
      id: `advanced-${index}`,
      name,
      category: 'advanced',
      color: 'secondary',
      relatedTopics: suggestions.filter(s => s.difficulty === 'advanced').map(s => s.title)
    });
  });

  // Generate practical tags
  const practicalTopics = [
    `${topic} Projects`,
    `${topic} Tools`,
    `${topic} Examples`,
    `${topic} Practice`
  ];

  practicalTopics.forEach((name, index) => {
    tags.push({
      id: `practical-${index}`,
      name,
      category: 'practical',
      color: 'accent',
      relatedTopics: suggestions.filter(s => s.difficulty !== 'advanced').map(s => s.title)
    });
  });

  return tags;
}
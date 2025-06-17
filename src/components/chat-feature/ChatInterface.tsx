"use client";

import React, { useRef, useEffect, useState } from 'react';
import type { Message, LearningPath, TopicTag, TopicSuggestion, EnhancedMessage, BranchingPath } from '../../types/chat-feature';
import MessageBubble from './MessageBubble';
import EnhancedMessageBubble from './EnhancedMessageBubble';
import LearningPathTracker from './LearningPathTracker';
import CustomLearningPathModal from './CustomLearningPathModal';
import LearningSidebar from './LearningSidebar';
import { Send, Loader2, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, Route, BookOpen, Brain, Sparkles, Zap, RefreshCw, GraduationCap, XCircle, Plus, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const iconMap: { [key: string]: React.ElementType } = {
  BookOpen,
  Brain,
  Sparkles,
  Zap,
  Route,
  RefreshCw,
  GraduationCap,
  XCircle,
  Plus,
  HelpCircle,
};

interface ChatInterfaceProps {
  /**
   * True if this is a brand new chat session (created by New Chat, no messages sent yet).
   * False if loaded from history or after first message is sent.
   */
  isNewSession: boolean;
  onSendMessage: (message: string) => void;
  messages: (Message | EnhancedMessage)[];
  isLoading: boolean;
  learningPath: LearningPath | null;
  searchHistory: string[];
  error?: string | null;
  onRetry?: () => void;
  onNewChat: () => void;
  topicSuggestions: TopicSuggestion[];
  topicTags: TopicTag[];
  selectedTags: string[];
  onTopicTagClick: (tag: TopicTag) => void;
  onCustomPathCreated: (pathId: string) => void;
}

interface TopicSuggestionCardProps {
  suggestion: TopicSuggestion;
  onClick: () => void;
  isSelected?: boolean;
}

const TopicSuggestionCard = ({ suggestion, onClick, isSelected = false }: TopicSuggestionCardProps) => (
  <button
    onClick={onClick}
    className={`p-4 bg-white rounded-lg shadow-sm border transition-all ${isSelected
      ? 'border-primary shadow-md'
      : 'border-gray-100 hover:border-primary/50'}`}
  >
    <h4 className="font-semibold text-gray-900">{suggestion.title}</h4>
    <p className="text-sm text-gray-600 mt-1">{suggestion.description}</p>
    <div className="flex items-center gap-2 mt-2">
      <span className="text-xs text-gray-500">{suggestion.time || '0 mins'}</span>
      <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
        {suggestion.difficulty}
      </span>
      {suggestion.tags && suggestion.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {suggestion.tags.map((tag, idx) => (
            <span key={idx} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  </button>
);

export const ChatInterface = ({
  onSendMessage, messages, isLoading, isNewSession,
  learningPath,
  searchHistory,
  error,
  onRetry,
  onNewChat,
  topicSuggestions,
  topicTags,
  selectedTags,
  onTopicTagClick,
  onCustomPathCreated,
}: ChatInterfaceProps) => {
  const [input, setInput] = useState('');
  const [showCustomPathModal, setShowCustomPathModal] = useState(false);
  const [isLearningPathVisible, setIsLearningPathVisible] = useState(true);
  const [showRelatedFields, setShowRelatedFields] = useState(true);
  const [selectedLearningMode, setSelectedLearningMode] = useState<'fundamental' | 'applied' | 'advanced'>('fundamental');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showLearningModeTooltip, setShowLearningModeTooltip] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Delay to ensure DOM has rendered
    const timeout = setTimeout(() => {
      scrollToBottom();
    }, 0);
    return () => clearTimeout(timeout);
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleBranchSelect = (path: BranchingPath) => {
    // console.log('Branch selected:', path);
    // When a branch is selected, send a message to explore that branch
    onSendMessage(`I want to explore: ${path.title}`);
  };

  // const handleTagSelect = (tag: TopicSuggestion) => {
  //   console.log('Tag selected:', tag);
  //   // Convert the TopicSuggestion to a TopicTag when needed
  //   const topicTag: TopicTag = {
  //     id: tag.id,
  //     name: tag.title,
  //     category: tag.difficulty || 'beginner',
  //     // Only include properties in the TopicTag interface
  //     relatedTopics: tag.tags || [],
  //     color: ''
  //   };

  //   onTopicTagClick(topicTag);
  //   onSendMessage(`Tell me about ${tag.title}`);
  // };

  // const handleStepToggle = (stepId: string) => {
  //   console.log('Step clicked:', stepId);
  // };

  // const handleBranchPathSelect = (path: BranchingPath) => {
  //   console.log('Branch selected:', path);
  //   // Update the learning path to include the selected branch
  //   if (learningPath) {
  //     // Update the UI to show learning path sidebar
  //     setIsLearningPathVisible(true);

  //     // Send a message based on the branch selection
  //     onSendMessage(`I'd like to explore ${path.title}: ${path.description || ''}`);
  //   }
  // };

  // const handleCustomPathCreated = (pathId: string) => {
  //   console.log('Custom path created:', pathId);
  //   setShowCustomPathModal(false);
  //   // Forward the path ID to the parent component
  //   onCustomPathCreated(pathId);

  //   // Send a message to confirm custom path creation
  //   onSendMessage('I would like to follow the custom learning path I just created.');

  //   // Show the learning path sidebar
  //   setIsLearningPathVisible(true);
  // };

  const handleSuggestionClick = (suggestion: TopicSuggestion) => {
    // console.log('Suggestion clicked:', suggestion);
    // When a suggestion is clicked, send a message to explore that topic
    onSendMessage(`Tell me about ${suggestion.title}`);

    // If it has tags, also trigger the tag selection flow
    if (suggestion.tags && suggestion.tags.length > 0) {
      // Find matching topic tags
      const matchingTag = topicTags.find(tag => suggestion.tags?.includes(tag.name));
      if (matchingTag) {
        onTopicTagClick(matchingTag);
      }
    }
  };

  // Sample suggestions for new chat
  const sampleSuggestions: TopicSuggestion[] = [
    {
      id: 'sample-1',
      title: 'JavaScript Fundamentals',
      description: 'Learn the core concepts of JavaScript programming',
      difficulty: 'beginner',
      estimatedTime: '2 hours',
      time: '2h',
      category: 'Programming',
      tags: ['javascript', 'web-development', 'programming']
    },
    {
      id: 'sample-2',
      title: 'React Hooks',
      description: 'Master useState, useEffect and other React hooks',
      difficulty: 'intermediate',
      estimatedTime: '3 hours',
      time: '3h',
      category: 'Frontend',
      tags: ['react', 'hooks', 'frontend']
    },
    {
      id: 'sample-3',
      title: 'TypeScript Advanced Types',
      description: 'Learn advanced TypeScript type manipulations',
      difficulty: 'advanced',
      estimatedTime: '4 hours',
      time: '4h',
      category: 'Programming',
      tags: ['typescript', 'advanced', 'types']
    },
    {
      id: 'sample-4',
      title: 'Python Data Science',
      description: 'Learn data analysis and visualization using Python',
      difficulty: 'intermediate',
      estimatedTime: '5 hours',
      time: '5h',
      category: 'Data Science',
      tags: ['python', 'data-science', 'analytics']
    },
    {
      id: 'web-dev',
      title: 'Web Development',
      description: 'Build interactive websites and applications.',
      icon: 'BookOpen',
      color: 'bg-blue-100 text-blue-800',
      difficulty: 'beginner',
      estimatedTime: '2-4 weeks',
    },
    {
      id: 'data-science',
      title: 'Data Science',
      description: 'Analyze data, build models, and gain insights.',
      icon: 'Brain',
      color: 'bg-green-100 text-green-800',
      difficulty: 'intermediate',
      estimatedTime: '3-6 weeks',
    },
    {
      id: 'ai',
      title: 'Artificial Intelligence',
      description: 'Explore machine learning, deep learning, and AI concepts.',
      icon: 'Sparkles',
      color: 'bg-purple-100 text-purple-800',
      difficulty: 'advanced',
      estimatedTime: '4-8 weeks',
    },
    {
      id: 'cloud-computing',
      title: 'Cloud Computing',
      description: 'Learn about cloud platforms like AWS, Azure, and GCP.',
      icon: 'Zap',
      color: 'bg-yellow-100 text-yellow-800',
      difficulty: 'beginner',
      estimatedTime: '2-4 weeks',
    },
    {
      id: 'machine-learning',
      title: 'Machine Learning',
      description: 'Explore algorithms that allow computers to learn from data.',
      icon: 'Brain',
      color: 'bg-primary/10',
      difficulty: 'intermediate',
      estimatedTime: '4-6 Weeks',
    },
    {
      id: 'quantum-physics',
      title: 'Quantum Physics',
      description: 'Delve into the strange and fascinating world of subatomic particles.',
      icon: 'Zap',
      color: 'bg-secondary/10',
      difficulty: 'advanced',
      estimatedTime: '6-8 Weeks',
    },
    {
      id: 'data-structures-algorithms',
      title: 'Data Structures & Algorithms',
      description: 'Master essential concepts for efficient problem-solving.',
      icon: 'Sparkles',
      color: 'bg-yellow-100',
      difficulty: 'intermediate',
      estimatedTime: '5-7 Weeks',
    }

  ];

  // Get latest suggestions from messages or use sample suggestions for new chat
  const latestSuggestions = messages.length > 0
    ? messages
      .filter((msg): msg is EnhancedMessage => 'enhancedContent' in msg && !!msg.enhancedContent?.suggestions)
      .flatMap(msg => msg.enhancedContent?.suggestions || [])
      .slice(0, 5)
    : sampleSuggestions;

  console.log('isNewSession', isNewSession);
  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 flex flex-col relative bg-gray-50">
        <div className={`flex-1 overflow-y-auto p-4 md:p-6 transition-all duration-300 ${isSidebarCollapsed ? 'pr-4 md:pr-6' : 'pr-4 md:pr-[calc(5rem+1.5rem)]'}`}>
          {/* Welcome screen for new chat */}
          {/* Welcome/Mission screen for brand new chat only (no messages, first session, or some isNewSession prop) */}
          {messages.length === 0 && !isNewSession && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-8 py-12">
              <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center">
                <Route className="w-10 h-10 text-orange-500" />
              </div>
              <div className="space-y-4 max-w-md">
                <h1 className="text-3xl font-bold text-gray-800">AI Learning Assistant</h1>
                <p className="text-lg text-gray-600">
                  Your intelligent learning companion
                </p>
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((message, index) => (
            <div key={index} className="mb-6">
              {message.sender === 'user' ? (
                <div className="flex justify-end">
                  <div className="max-w-[100%] bg-orange-50 rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
                    <p className="text-gray-800">{message.text}</p>
                    <div className="text-right mt-1">
                      <span className="text-xs text-gray-400">{message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex w-full">

                  <div className="flex-1">
                    <div className="flex items-center text-xs text-gray-500 mb-1 ml-1"><div className="mr-3 flex-shrink-0"><div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center"><Route className="w-4 h-4 text-orange-500" /></div></div><span className="text-gray-400">{message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span></div>
                    {('enhancedContent' in message && message.type !== 'practice_problems_list') ? (
                      <EnhancedMessageBubble
                        message={message}
                        onBranchSelect={handleBranchSelect}
                        onTagSelect={handleSuggestionClick} />
                    ) : (
                      <>

                        <MessageBubble message={message} isCurrentUser={false} />
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
            </div>
          )}
          {error && (
            <div className="flex flex-col items-center justify-center text-red-500 space-y-2">
              <p>{error}</p>
              {onRetry && (
                <button
                  onClick={() => {
                    // Reset UI state when starting a new chat
                    setInput('');
                    setShowCustomPathModal(false);
                    setIsLearningPathVisible(true);
                    onNewChat();
                  }}
                  className="flex items-center px-4 py-2 border border-gray-200 rounded-md hover:border-primary/50 text-gray-700 hover:text-primary transition-colors duration-200"
                >
                  Retry
                </button>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4 bg-background/80 backdrop-blur-sm">
          <div className="flex items-end space-x-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              rows={1}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>

      {/* Right Sidebar for Learning Path and Suggestions */}
      {/* {(learningPath || topicSuggestions.length > 0 || topicTags.length > 0) && (
        <LearningSidebar
          learningPath={learningPath || undefined}
          latestSuggestions={topicSuggestions}
          topicSuggestions={topicSuggestions}
          topicTags={topicTags}
          searchHistory={searchHistory}
          selectedLearningMode={selectedLearningMode}
          onLearningModeChange={setSelectedLearningMode}
          onTopicTagClick={onTopicTagClick}
          onCustomPathCreated={(pathOrId: any) => {
            if (typeof pathOrId === 'string') {
              onCustomPathCreated(pathOrId);
            } else {
              onCustomPathCreated(pathOrId.id);
      )} */}
    </div>
  );
}

export default ChatInterface;
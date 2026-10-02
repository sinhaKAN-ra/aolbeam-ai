"use client";

import React, { useRef, useEffect, useState } from 'react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { toast } from 'sonner';
import type { Message, LearningPath, TopicTag, TopicSuggestion, EnhancedMessage, BranchingPath } from '../../types/chat-feature';
import MessageBubble from './MessageBubble';
import EnhancedMessageBubble from './EnhancedMessageBubble';
import LearningPathTracker from './LearningPathTracker';
import CustomLearningPathModal from './CustomLearningPathModal';
import LearningSidebar from './LearningSidebar';
import { Send, Loader2, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, Route, BookOpen, Brain, Sparkles, Zap, RefreshCw, GraduationCap, XCircle, Plus, HelpCircle, Lightbulb, ArrowRight, Target } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { guestChatRemaining } from '@/lib/guestTrial';

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
  onExpandMessage?: (messageId: string, topic: string) => void;
  expandingIds?: string[];
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
  onExpandMessage,
  expandingIds = [],
}: ChatInterfaceProps) => {
  const [input, setInput] = useState('');
  const [showCustomPathModal, setShowCustomPathModal] = useState(false);
  const [isLearningPathVisible, setIsLearningPathVisible] = useState(true);
  const [showRelatedFields, setShowRelatedFields] = useState(true);
  const [selectedLearningMode, setSelectedLearningMode] = useState<'fundamental' | 'applied' | 'advanced'>('fundamental');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showLearningModeTooltip, setShowLearningModeTooltip] = useState(false);
  const [forceScroll, setForceScroll] = useState(false); // New state to force scroll

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (forceScroll) {
      const timeout = setTimeout(() => {
        scrollToBottom();
        setForceScroll(false); // Reset after scrolling
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, [forceScroll]);

  const { 
    canUseFeature, 
    recordFeatureUsage,
    isLoading: isFeatureCheckLoading,
    usage,
    refetchUsage
  } = useFeatureAccess();
  
  const [isProcessingMessage, setIsProcessingMessage] = useState(false);
  const chatUsage = {
    used: usage?.chat_interactions_today || 0,
    limit: usage?.chat_limit || 30,
    remaining: usage?.remaining_chats || 30
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isProcessingMessage) return;

    const text = input.trim();
    try {
      setIsProcessingMessage(true);
      // Limit enforcement + usage recording now happen server-side in
      // /api/chat/stream (single source of truth). Just send the message.
      onSendMessage(text);
      setInput('');
      setForceScroll(true);
      // Refresh the usage counter shown in the UI.
      refetchUsage().catch(() => {});
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsProcessingMessage(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleBranchSelect = (path: BranchingPath) => {
    // When a branch is selected, send a message to explore that branch
    onSendMessage(`I want to explore: ${path.title} in this context ${path.description}`);
    setForceScroll(true);
  };

  // const handleTagSelect = (tag: TopicSuggestion) => {
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
    // When a suggestion is clicked, send a message to explore that topic
    onSendMessage(`Tell me about ${suggestion.title}`);
    setForceScroll(true);

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


const sampleTopics = [
  {
    title: 'Machine Learning',
    description: 'Explore AI algorithms, neural networks, and data science fundamentals',
    difficulty: 'Intermediate',
    time: '4-6 weeks',
    color: 'bg-gradient-to-r from-blue-100 to-blue-200',
    icon: <Brain className="w-5 h-5 text-blue-600" />
  },
  {
    title: 'Quantum Physics',
    description: 'Dive into quantum mechanics, superposition, and quantum computing',
    difficulty: 'Advanced',
    time: '6-8 weeks',
    color: 'bg-gradient-to-r from-purple-100 to-purple-200',
    icon: <Zap className="w-5 h-5 text-purple-600" />
  },
  {
    title: 'Web Development',
    description: 'Master modern web technologies, frameworks, and best practices',
    difficulty: 'Beginner',
    time: '3-4 weeks',
    color: 'bg-gradient-to-r from-green-100 to-green-200',
    icon: <BookOpen className="w-5 h-5 text-green-600" />
  },
  {
    title: 'Data Science',
    description: 'Learn data analysis, visualization, and statistical modeling',
    difficulty: 'Intermediate',
    time: '5-7 weeks',
    color: 'bg-gradient-to-r from-orange-100 to-orange-200',
    icon: <Target className="w-5 h-5 text-orange-600" />
  },
  {
    title: 'Blockchain Technology',
    description: 'Understand cryptocurrencies, smart contracts, and decentralized systems',
    difficulty: 'Advanced',
    time: '4-5 weeks',
    color: 'bg-gradient-to-r from-yellow-100 to-yellow-200',
    icon: <Sparkles className="w-5 h-5 text-yellow-600" />
  },
  {
    title: 'Digital Marketing',
    description: 'Master SEO, social media, content marketing, and analytics',
    difficulty: 'Beginner',
    time: '2-3 weeks',
    color: 'bg-gradient-to-r from-pink-100 to-pink-200',
    icon: <ArrowRight className="w-5 h-5 text-pink-600" />
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
      <div className="flex-1 flex flex-col relative bg-background">
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6 transition-all duration-300">
          <div className="max-w-3xl mx-auto w-full">
          {/* Welcome + starter topics: only on a brand-new empty session */}
          {isNewSession && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                What would you like to learn?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-md">
                Ask me anything — I remember the conversation, so you can go deeper with follow-ups.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
                {sampleTopics.slice(0, 4).map((topic) => (
                  <button
                    key={topic.title}
                    onClick={() => onSendMessage(`Tell me about ${topic.title}`)}
                    className="group p-4 bg-card rounded-xl border border-border hover:border-primary/50 hover:shadow-md transition-all text-left"
                  >
                    <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {topic.title}
                    </span>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                      {topic.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
          

          {/* Messages */}
          {messages.map((message, index) => (
            <div key={index} className="mb-6">
              {message.sender === 'user' ? (
                <div className="flex justify-end">
                  <div className="max-w-[100%] bg-primary/10 rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
                    <p className="text-foreground whitespace-pre-wrap">{message.text}</p>
                    <div className="text-right mt-1">
                      <span className="text-xs text-muted-foreground">{message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex w-full">
                  <div className="flex-1">
                    {('enhancedContent' in message && message.type !== 'practice_problems_list') ? (
                      <EnhancedMessageBubble
                        message={message}
                        onBranchSelect={handleBranchSelect}
                        onTagSelect={handleSuggestionClick}
                        onRetry={onRetry}
                      />
                    ) : (
                      <MessageBubble
                        message={message}
                        isCurrentUser={false}
                        onRetry={onRetry}
                        onExpand={
                          message.sender === 'ai' && !message.isTyping && onExpandMessage
                            ? () => {
                                const prevUser = [...messages.slice(0, index)]
                                  .reverse()
                                  .find(m => m.sender === 'user');
                                onExpandMessage(message.id, prevUser?.text || message.text);
                              }
                            : undefined
                        }
                        isExpanding={expandingIds.includes(message.id)}
                        hasExtras={'enhancedContent' in message && !!(message as EnhancedMessage).enhancedContent?.suggestions}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {error && (
            <div className="flex flex-col items-center justify-center text-destructive space-y-2">
              <p>{error}</p>
              {onRetry && (
                <button
                  onClick={() => { if (onRetry) onRetry(); }}
                  className="flex items-center px-4 py-2 border border-border rounded-md hover:border-primary/50 text-foreground hover:text-primary transition-colors duration-200"
                >
                  Retry
                </button>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="border-t border-border p-4 bg-background/80 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto">
          <div className="flex items-end space-x-2 relative">
            {/* Usage indicator for chat messages */}
            {/* <div className="absolute -top-8 right-0 text-xs text-muted-foreground">
              {chatUsage.used} / {chatUsage.limit} messages used
            </div> */}
            {!isFeatureCheckLoading && (
              <div className="absolute -top-8 right-0 text-xs text-muted-foreground">
                {(() => {
                  const { remaining, limit } = canUseFeature('chat');
                  if (typeof remaining === 'number' && typeof limit === 'number') {
                    return (
                      <span>
                        {remaining} of {limit} messages remaining today
                      </span>
                    );
                  }
                  // Guest (no plan): show the free-trial allowance.
                  const guestLeft = guestChatRemaining();
                  return (
                    <span>
                      {guestLeft} free message{guestLeft === 1 ? '' : 's'} left · sign in for more
                    </span>
                  );
                })()}
              </div>
            )}
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Message A…"
              className="flex-1 p-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              style={{ height: 'auto', maxHeight: '150px' }}
              rows={1}
              aria-multiline={true}
              maxLength={5000}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${target.scrollHeight}px`;
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <div className="text-[11px] text-muted-foreground mt-1.5 text-right">
            {input.length}/5000
          </div>
          </div>
      </form>
      </div>
      </div>
  );
}

export default ChatInterface;
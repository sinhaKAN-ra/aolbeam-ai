"use client";

import React, { useRef, useEffect, useState } from 'react';
import type { Message, LearningPath, TopicTag, TopicSuggestion, EnhancedMessage, BranchingPath } from '../../types/chat-feature';
import MessageBubble from './MessageBubble';
import EnhancedMessageBubble from './EnhancedMessageBubble';
import LearningPathTracker from './LearningPathTracker';
import CustomLearningPathModal from './CustomLearningPathModal';
import { Send, Loader2, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, Route, BookOpen, Brain, Sparkles, Zap } from 'lucide-react';

interface ChatInterfaceProps {
  onSendMessage: (message: string) => void;
  messages: (Message | EnhancedMessage)[];
  isLoading: boolean;
  learningPath: LearningPath | null;
  searchHistory: string[];
  error?: string | null;
  onRetry?: () => void;
}

interface TopicSuggestionCardProps {
  suggestion: TopicSuggestion;
  onClick: () => void;
}

const TopicSuggestionCard = ({ suggestion, onClick }: TopicSuggestionCardProps) => (
  <button
    onClick={onClick}
    className="p-4 bg-white rounded-lg shadow-sm border border-gray-100 hover:border-primary/50 transition-all"
  >
    <h4 className="font-semibold text-gray-900">{suggestion.title}</h4>
    <p className="text-sm text-gray-600 mt-1">{suggestion.description}</p>
    <div className="flex items-center gap-2 mt-2">
      <span className="text-xs text-gray-500">{suggestion.time || '0 mins'}</span>
      <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
        {suggestion.difficulty}
      </span>
    </div>
  </button>
);

export const ChatInterface = ({
  onSendMessage,
  messages,
  isLoading,
  learningPath,
  searchHistory,
  error,
  onRetry
}: ChatInterfaceProps) => {
  const [input, setInput] = useState('');
  const [showCustomPathModal, setShowCustomPathModal] = useState(false);
  const [isLearningPathVisible, setIsLearningPathVisible] = useState(true);
  const [showRelatedFields, setShowRelatedFields] = useState(true);
  const [selectedLearningMode, setSelectedLearningMode] = useState<'fundamental' | 'applied' | 'advanced'>('fundamental');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
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
    console.log('Branch selected:', path);
    // When a branch is selected, send a message to explore that branch
    onSendMessage(`I want to explore: ${path.title}`);
  };

  const handleTagSelect = (tag: TopicSuggestion) => {
    console.log('Tag selected:', tag);
  };

  const handleStepToggle = (stepId: string) => {
    console.log('Step clicked:', stepId);
  };

  const handleBranchPathSelect = (branchId: string) => {
    console.log('Branch selected:', branchId);
    // When a branch path is selected, update the UI to show that branch
    if (learningPath) {
      const branchStep = learningPath.steps.find(step => step.id === branchId);
      if (branchStep) {
        onSendMessage(`I want to learn more about ${branchStep.title}`);
      }
    }
  };

  const handleCustomPathCreated = (pathId: string) => {
    console.log('Custom path created:', pathId);
    setShowCustomPathModal(false);
  };

  const handleSuggestionClick = (suggestion: TopicSuggestion) => {
    console.log('Suggestion clicked:', suggestion);
    // When a suggestion is clicked, send a message to explore that topic
    onSendMessage(`Tell me about ${suggestion.title}`);
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
      icon: <BookOpen className="w-5 h-5" />,
      color: 'bg-blue-100 text-blue-800',
      difficulty: 'beginner',
      estimatedTime: '2-4 weeks',
    },
    {
      id: 'data-science',
      title: 'Data Science',
      description: 'Analyze data, build models, and gain insights.',
      icon: <Brain className="w-5 h-5" />,
      color: 'bg-green-100 text-green-800',
      difficulty: 'intermediate',
      estimatedTime: '3-6 weeks',
    },
    {
      id: 'ai',
      title: 'Artificial Intelligence',
      description: 'Explore machine learning, deep learning, and AI concepts.',
      icon: <Sparkles className="w-5 h-5" />,
      color: 'bg-purple-100 text-purple-800',
      difficulty: 'advanced',
      estimatedTime: '4-8 weeks',
    },
    {
      id: 'cloud-computing',
      title: 'Cloud Computing',
      description: 'Learn about cloud platforms like AWS, Azure, and GCP.',
      icon: <Zap className="w-5 h-5" />,
      color: 'bg-yellow-100 text-yellow-800',
      difficulty: 'beginner',
      estimatedTime: '2-4 weeks',
    },
    {
      id: 'machine-learning',
      title: 'Machine Learning',
      description: 'Explore algorithms that allow computers to learn from data.',
      icon: <Brain className="w-6 h-6 text-primary" />,
      color: 'bg-primary/10',
      difficulty: 'intermediate',
      estimatedTime: '4-6 Weeks',
    },
    {
      id: 'quantum-physics',
      title: 'Quantum Physics',
      description: 'Delve into the strange and fascinating world of subatomic particles.',
      icon: <Zap className="w-6 h-6 text-secondary" />,
      color: 'bg-secondary/10',
      difficulty: 'advanced',
      estimatedTime: '6-8 Weeks',
    },
    {
      id: 'data-structures-algorithms',
      title: 'Data Structures & Algorithms',
      description: 'Master essential concepts for efficient problem-solving.',
      icon: <Sparkles className="w-6 h-6 text-yellow-600" />,
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

    return (
      <div className="flex h-screen bg-background">
        <div className="flex-1 flex flex-col relative bg-gray-50">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            {/* Welcome screen for new chat */}
            {messages.length === 0 && (
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-4xl mt-6">
                  <div className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Continue Your Learning Journey</h2>
                    {sampleSuggestions.slice(0, 4).map(suggestion => (
                      <button
                        key={suggestion.id}
                        onClick={() => {
                          onSendMessage(`Tell me about ${suggestion.title}`);
                        }}
                        className="flex items-center w-full p-3 hover:bg-orange-50 rounded-lg mb-3 group transition-all text-left border border-transparent hover:border-orange-200"
                      >
                        <div className="mr-3 p-2 rounded-lg bg-orange-100 text-orange-500 group-hover:bg-orange-200">
                          {suggestion.icon || <BookOpen className="w-5 h-5" />}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-800">{suggestion.title}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{suggestion.difficulty}</span>
                            <span className="text-xs text-gray-500">{suggestion.time || suggestion.estimatedTime}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Explore Popular Topics</h2>
                    {sampleSuggestions.slice(0, 4).map(suggestion => (
                      <button
                        key={suggestion.id + "-explore"}
                        onClick={() => {
                          onSendMessage(`Tell me about ${suggestion.title}`);
                        }}
                        className="flex items-center w-full p-3 hover:bg-orange-50 rounded-lg mb-3 group transition-all text-left border border-transparent hover:border-orange-200"
                      >
                        <div className="mr-3 p-2 rounded-lg bg-orange-100 text-orange-500 group-hover:bg-orange-200">
                          {suggestion.icon || <BookOpen className="w-5 h-5" />}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-800">{suggestion.title}</h3>
                          <p className="text-xs text-gray-500 line-clamp-1">{suggestion.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Messages */}
            {messages.map((message, index) => (
              <div key={index} className="mb-6">
                {message.sender === 'user' ? (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] bg-orange-50 rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
                      <p className="text-gray-800">{message.text}</p>
                      <div className="text-right mt-1">
                        <span className="text-xs text-gray-400">{message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex max-w-4xl w-full">
                    <div className="mr-3 mt-1 flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                        <Route className="w-4 h-4 text-orange-500" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 mb-1 ml-1">AI Assistant</div>
                      {'enhancedContent' in message ? (
                        <EnhancedMessageBubble 
                          message={message} 
                          onBranchSelect={handleBranchSelect}
                          onTagSelect={handleSuggestionClick}
                        />
                      ) : (
                        <div className="bg-white rounded-2xl rounded-tl-sm p-4 shadow-sm">
                          <div className="prose max-w-none">{message.text}</div>
                          <div className="text-right mt-1">
                            <span className="text-xs text-gray-400">{message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                          </div>
                        </div>
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
                    onClick={onRetry}
                    className="px-4 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-colors"
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
        {(learningPath || latestSuggestions.length > 0) && (
          <div className={`w-80 border-l border-gray-200 bg-white p-6 overflow-y-auto flex flex-col h-screen`}>
            <button
              onClick={() => setIsLearningPathVisible(!isLearningPathVisible)}
              className="absolute top-1/2 -left-4 -translate-y-1/2 p-2 rounded-full bg-white shadow-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/50 z-20"
              aria-label={isLearningPathVisible ? 'Hide Learning Path' : 'Show Learning Path'}
            >
              {isLearningPathVisible ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
    
            {/* Learning Journey Section */}
            {learningPath && (
              <div className="mb-8 relative">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                    <Route className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-800">Learning Journey</h3>
                    <p className="text-xs text-gray-500">Track your progress</p>
                  </div>
                </div>
    
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1">
                    <div className="h-full bg-gradient-to-r from-orange-400 to-orange-500 w-[20%]"></div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Step 1 of 5</span>
                    <span>20% Complete</span>
                  </div>
                </div>
    
                {/* Current Focus */}
                {learningPath && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Current Focus</h4>
                    <div className="p-3 border border-orange-100 bg-orange-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <BookOpen className="w-4 h-4 text-orange-500" />
                        <h5 className="font-medium text-gray-800">{learningPath.title || "Web Development"}</h5>
                      </div>
                      <p className="text-xs text-gray-600 ml-6">Active learning session</p>
                    </div>
                  </div>
                )}
    
                {/* Learning Path Content */}
                {isLearningPathVisible && learningPath && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-600 mb-3">Suggested Next Steps</h4>
                    <LearningPathTracker
                      learningPath={learningPath}
                      onStepToggle={handleStepToggle}
                      className="bg-white rounded-lg shadow-sm"
                    />
                  </div>
                )}
              </div>
            )}
    
            {/* Custom Learning Path Modal */}
            {showCustomPathModal && (
              <CustomLearningPathModal
                isOpen={true}
                onClose={() => setShowCustomPathModal(false)}
                onPathCreated={handleCustomPathCreated}
                searchHistory={searchHistory || []}
              />
            )}
          </div>
        )}
      </div>
    );
  }

export default ChatInterface;
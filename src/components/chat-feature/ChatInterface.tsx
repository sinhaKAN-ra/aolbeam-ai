"use client"

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, BookOpen, Lightbulb, ArrowRight, Target, Plus, Sparkles, Brain, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { 
  Message, 
  TopicSuggestion, 
  LearningPath, 
  TopicTag, 
  ChatInterfaceProps 
} from '../../types/chat-feature';
import MessageBubble from './MessageBubble';
import TopicSuggestionCard from './TopicSuggestionCard';
import LearningPathTracker from './LearningPathTracker';
import { TopicTagsPanel } from './TopicTagsPanel';
import CustomLearningPathModal from './CustomLearningPathModal';

// ChatInterfaceProps is now imported from chat-feature types

const sampleTopics: TopicSuggestion[] = [
  {
    id: 'web-dev',
    title: 'Web Development',
    description: 'Build interactive websites and applications.',
    icon: <BookOpen className="w-5 h-5" />,
    color: 'bg-blue-100 text-blue-800',
    difficulty: 'beginner',
    time: '2-4 weeks'
  },
  {
    id: 'data-science',
    title: 'Data Science',
    description: 'Analyze data, build models, and gain insights.',
    icon: <Brain className="w-5 h-5" />,
    color: 'bg-green-100 text-green-800',
    difficulty: 'intermediate',
    time: '3-6 weeks'
  },
  {
    id: 'ai',
    title: 'Artificial Intelligence',
    description: 'Explore machine learning, deep learning, and AI concepts.',
    icon: <Sparkles className="w-5 h-5" />,
    color: 'bg-purple-100 text-purple-800',
    difficulty: 'advanced',
    time: '4-8 weeks'
  },
  {
    id: 'cloud-computing',
    title: 'Cloud Computing',
    description: 'Learn about cloud platforms like AWS, Azure, and GCP.',
    icon: <Zap className="w-5 h-5" />,
    color: 'bg-yellow-100 text-yellow-800',
    difficulty: 'beginner',
    time: '2-4 weeks'
  },
  {
    id: 'machine-learning',
    title: 'Machine Learning',
    description: 'Explore algorithms that allow computers to learn from data.',
    icon: <Brain className="w-6 h-6 text-primary" />,
    color: 'bg-primary/10',
    difficulty: 'intermediate',
    time: '4-6 Weeks'
  },
  {
    id: 'quantum-physics',
    title: 'Quantum Physics',
    description: 'Delve into the strange and fascinating world of subatomic particles.',
    icon: <Zap className="w-6 h-6 text-secondary" />,
    color: 'bg-secondary/10',
    difficulty: 'advanced',
    time: '6-8 Weeks'
  },
  {
    id: 'data-structures-algorithms',
    title: 'Data Structures & Algorithms',
    description: 'Master essential concepts for efficient problem-solving.',
    icon: <Sparkles className="w-6 h-6 text-yellow-600" />,
    color: 'bg-yellow-100',
    difficulty: 'intermediate',
    time: '5-7 Weeks'
  }
];

// Sample topics for the initial welcome screen


const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onSendMessage,
  messages,
  isLoading,
  learningPath,
  searchHistory,
  error, // Destructure error prop
  onRetry // Destructure onRetry prop
}) => {
  const [inputValue, setInputValue] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showCustomPathModal, setShowCustomPathModal] = useState(false);
  const [showRelatedFields, setShowRelatedFields] = useState(true); // New state for related fields visibility
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    
    const message = inputValue.trim();
    setInputValue('');
    await onSendMessage(message);
  };

  const handleSuggestionClick = async (suggestion: TopicSuggestion) => {
    await onSendMessage(`Tell me about ${suggestion.title}`);
  };

  const handleTopicTagClick = async (tag: TopicTag) => {
    if (selectedTags.includes(tag.id)) {
      setSelectedTags(selectedTags.filter(id => id !== tag.id));
    } else {
      setSelectedTags([...selectedTags, tag.id]);
      await onSendMessage(`Tell me more about ${tag.name}`);
    }
  }; 

  const handleCustomPathCreated = (pathId: string) => {
    console.log('Custom path created:', pathId);
    setShowCustomPathModal(false);
  };



  const latestMessage = messages[messages.length - 1];
  // Get suggestions from message if it has any
  const latestSuggestions = latestMessage && 'suggestions' in latestMessage 
    ? (latestMessage as { suggestions: TopicSuggestion[] }).suggestions || [] 
    : [];
  // Generate tags from suggestions if needed
  const latestTags = latestSuggestions.length > 0 ? generateTagsFromSuggestions(latestSuggestions) : [];

  return (
    <div className="flex flex-col h-screen">
      {/* Modern Header */}
      <div className="bg-card/90 backdrop-blur-xl border-b border-border/50 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="p-3 bg-gradient-to-r from-primary-600 via-secondary-500 to-accent-500 rounded-2xl shadow-lg">
                <Brain className="w-7 h-7 text-primary-foreground" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                AI Learning Assistant
              </h1>
              <p className="text-sm text-muted-foreground font-medium">Your intelligent learning companion</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowCustomPathModal(true)}
            className="group flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-2xl hover:from-primary/90 hover:to-secondary/90 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Target className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
            <span className="font-semibold">Create Learning Path</span>
            <Sparkles className="w-4 h-4 opacity-70" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col relative z-10 bg-background">
          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
            {messages.length === 0 ? (
              <div className="text-center mt-16">
                <div className="relative inline-flex mb-8">
                  <div className="p-6 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-3xl shadow-lg">
                    <Lightbulb className="w-12 h-12 text-primary" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-accent rounded-full animate-bounce"></div>
                </div>
                
                <h2 className="text-3xl font-bold text-foreground mb-3">
                  What would you like to 
                  <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"> learn </span>
                  today?
                </h2>
                <p className="text-muted-foreground mb-10 max-w-lg mx-auto text-lg leading-relaxed">
                  Ask me about any topic, and I'll create a personalized learning journey with intelligent suggestions and related concepts.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
                  {sampleTopics.map((topic, index) => (
                    <button
                      key={topic.title}
                      onClick={() => onSendMessage(`Tell me about ${topic.title}`)}
                      className="group p-6 bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 hover:border-primary hover:shadow-xl transition-all duration-300 text-left transform hover:-translate-y-1"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-xl ${topic.color}`}>
                          {topic.icon}
                        </div>
                        <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {topic.title}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{topic.description}</p>
                      <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                        <Zap className="w-3 h-3" />
                        <span>{topic.difficulty}</span>
                        <span>•</span>
                        <span>{topic.time}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
              </div>
            )}

            {isLoading && (
              <div className="flex items-center gap-4 p-4 bg-card/60 backdrop-blur-sm rounded-2xl border border-border/50 w-fit">
                <div className="relative">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <div className="absolute inset-0 w-6 h-6 border-2 border-primary/20 rounded-full animate-pulse"></div>
                </div>
                <span className="text-foreground font-medium">AI is crafting your learning experience...</span>
              </div>
            )}

            {/* Topic Tags Panel - remains in main chat area for now, can be moved later if needed */}
            {latestTags.length > 0 && (
              <TopicTagsPanel
                tags={latestTags}
                onTagClick={handleTopicTagClick}
                selectedTags={selectedTags}
              />
            )}

            {/* Related Fields / Search History - now in main chat area */}
            {searchHistory && searchHistory.length > 0 && (
              <div className="mt-8 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold text-foreground">Related Fields</h3>
                  <button 
                    onClick={() => setShowRelatedFields(!showRelatedFields)}
                    className="p-1 rounded-full hover:bg-muted transition-colors"
                  >
                    {showRelatedFields ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                  </button>
                </div>
                {showRelatedFields && (
                  <div className="flex flex-wrap gap-2">
                    {searchHistory.map((item, index) => (
                      <span key={index} className="px-3 py-1 bg-muted rounded-full text-sm text-muted-foreground">
                        {item}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {error && messages.length > 0 && (
              <div className="mt-4 flex justify-center">
                <button 
                  onClick={onRetry}
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSubmit} className="flex items-center p-4 border-t border-border/50 bg-card/90 backdrop-blur-xl">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={isLoading ? "Generating response..." : "Ask about any topic you want to explore..."}
              className="flex-1 p-3 rounded-full bg-muted/50 border border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-300 text-foreground placeholder-muted-foreground text-lg"
              disabled={isLoading}
              ref={inputRef}
            />
            <button
              type="submit"
              className="ml-4 p-3 bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-full shadow-lg hover:from-primary/90 hover:to-secondary/90 transition-all duration-300 transform hover:scale-105"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Send className="w-6 h-6" />
              )}
            </button>
          </form>
        </div>

        {(learningPath || latestSuggestions.length > 0) && (
          <div className="w-96 bg-card/80 backdrop-blur-xl border-l border-border/50 p-6 flex flex-col overflow-y-auto custom-scrollbar shadow-lg">
          {/* Learning Journey / Learning Path Tracker */}
          {learningPath && (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-r from-primary/10 to-primary/20 rounded-xl">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Learning Journey</h3>
              </div>
              <LearningPathTracker learningPath={learningPath} />
            </div>
          )}

          {/* Suggested Next Steps / Topic Suggestions */}
          {latestSuggestions.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-r from-accent/10 to-accent/20 rounded-xl">
                  <Lightbulb className="w-5 h-5 text-accent" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Suggested Next Steps</h3>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {latestSuggestions.map((suggestion) => (
                  <TopicSuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    onClick={() => handleSuggestionClick(suggestion)}
                  />
                ))}
              </div>
            </div>
          )}


          </div>
        )}
      </div>

      {showCustomPathModal && (
        <CustomLearningPathModal
          isOpen={showCustomPathModal}
          onClose={() => setShowCustomPathModal(false)}
          onPathCreated={(pathId) => {
            handleCustomPathCreated(pathId);
            setShowCustomPathModal(false);
          }}
          searchHistory={searchHistory}
        />
      )}
    </div>
  );
};

// Helper to generate tags if not provided by AI (for demo)
const generateTagsFromSuggestions = (suggestions: any[]): TopicTag[] => {
  if (!suggestions || suggestions.length === 0) return [];
  
  const allSuggestionTags = suggestions.flatMap(s => s.tags || []);
  const uniqueTags = Array.from(new Set(allSuggestionTags.slice(0, 10))); 

  return uniqueTags.map((tag, index) => ({
    id: `generated-${index}`,
    name: tag,
    category: ['fundamental', 'advanced', 'practical'][index % 3],
    color: ['bg-primary/10', 'bg-secondary/10', 'bg-accent/10'][index % 3],
    relatedTopics: suggestions.map(s => s.title)
  }));
};


   
export default ChatInterface;

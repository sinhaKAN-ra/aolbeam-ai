import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, BookOpen, Lightbulb, ArrowRight, Target, Plus, Sparkles, Brain, Zap } from 'lucide-react';
import { Message, TopicSuggestion, LearningPath, TopicTag } from '../types';
import MessageBubble from './MessageBubble';
import TopicSuggestionCard from './TopicSuggestionCard';
import LearningPathTracker from './LearningPathTracker';
import TopicTagsPanel from './TopicTagsPanel';
import CustomLearningPathModal from './CustomLearningPathModal';
import { learningPathService } from '../services/learningPathService';

interface ChatInterfaceProps {
  onSendMessage: (message: string) => Promise<void>;
  messages: Message[];
  isLoading: boolean;
  learningPath: LearningPath | null;
  searchHistory: string[];
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onSendMessage,
  messages,
  isLoading,
  learningPath,
  searchHistory
}) => {
  const [inputValue, setInputValue] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showCustomPathModal, setShowCustomPathModal] = useState(false);
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

  const handleTagClick = async (tag: TopicTag) => {
    if (selectedTags.includes(tag.id)) {
      setSelectedTags(selectedTags.filter(id => id !== tag.id));
    } else {
      setSelectedTags([...selectedTags, tag.id]);
      await onSendMessage(`Explore ${tag.name} in detail`);
    }
  };

  const handleCustomPathCreated = (pathId: string) => {
    console.log('Custom path created:', pathId);
    setShowCustomPathModal(false);
  };

  const latestMessage = messages[messages.length - 1];
  const latestSuggestions = latestMessage?.suggestions || [];
  const latestTags = latestMessage?.tags || generateTagsFromSuggestions(latestSuggestions);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-50">
      {/* Modern Header */}
      <div className="bg-white/90 backdrop-blur-xl border-b border-orange-200/50 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="p-3 bg-gradient-to-r from-primary-600 via-secondary-500 to-accent-500 rounded-2xl shadow-lg">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent-400 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                AI Learning Assistant
              </h1>
              <p className="text-sm text-gray-600 font-medium">Your intelligent learning companion</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowCustomPathModal(true)}
            className="group flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-2xl hover:from-primary-700 hover:to-secondary-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Target className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
            <span className="font-semibold">Create Learning Path</span>
            <Sparkles className="w-4 h-4 opacity-70" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {messages.length === 0 && (
              <div className="text-center mt-16">
                <div className="relative inline-flex mb-8">
                  <div className="p-6 bg-gradient-to-r from-primary-100 to-secondary-100 rounded-3xl shadow-lg">
                    <Lightbulb className="w-12 h-12 text-primary-600" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-accent-400 rounded-full animate-bounce"></div>
                </div>
                
                <h2 className="text-3xl font-bold text-gray-800 mb-3">
                  What would you like to 
                  <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent"> learn </span>
                  today?
                </h2>
                <p className="text-gray-600 mb-10 max-w-lg mx-auto text-lg leading-relaxed">
                  Ask me about any topic, and I'll create a personalized learning journey with intelligent suggestions and related concepts.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
                  {sampleTopics.map((topic, index) => (
                    <button
                      key={topic.title}
                      onClick={() => onSendMessage(`Tell me about ${topic.title}`)}
                      className="group p-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-orange-200/50 hover:border-primary-300 hover:shadow-xl transition-all duration-300 text-left transform hover:-translate-y-1"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-xl ${topic.color}`}>
                          {topic.icon}
                        </div>
                        <span className="font-semibold text-gray-800 group-hover:text-primary-600 transition-colors">
                          {topic.title}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{topic.description}</p>
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
            )}

            <div className="space-y-8">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}

              {isLoading && (
                <div className="flex items-center gap-4 p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-orange-200/50 w-fit">
                  <div className="relative">
                    <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                    <div className="absolute inset-0 w-6 h-6 border-2 border-primary-200 rounded-full animate-pulse"></div>
                  </div>
                  <span className="text-gray-700 font-medium">AI is crafting your learning experience...</span>
                </div>
              )}

              {/* Enhanced Topic Suggestions */}
              {latestSuggestions.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-accent-100 to-accent-200 rounded-xl">
                      <Lightbulb className="w-5 h-5 text-accent-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">Continue Your Learning Journey</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

              {/* Enhanced Topic Tags */}
              {latestTags.length > 0 && (
                <TopicTagsPanel
                  tags={latestTags}
                  onTagClick={handleTagClick}
                  selectedTags={selectedTags}
                />
              )}
            </div>

            <div ref={messagesEndRef} />
          </div>

          {/* Modern Input Form */}
          <div className="border-t border-orange-200/50 bg-white/90 backdrop-blur-xl p-6">
            <form onSubmit={handleSubmit} className="flex gap-4">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask about any topic you want to explore..."
                  className="w-full px-6 py-4 bg-white/80 backdrop-blur-sm border border-orange-300/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-800 placeholder-gray-500 shadow-sm transition-all duration-300"
                  disabled={isLoading}
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse"></div>
                </div>
              </div>
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="px-8 py-4 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-2xl hover:from-primary-700 hover:to-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none font-semibold"
              >
                <Send className="w-5 h-5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>

        {/* Enhanced Learning Path Sidebar */}
        {learningPath && (
          <div className="w-96 border-l border-orange-200/50 bg-white/70 backdrop-blur-xl">
            <LearningPathTracker learningPath={learningPath} />
          </div>
        )}
      </div>

      {/* Custom Learning Path Modal */}
      <CustomLearningPathModal
        isOpen={showCustomPathModal}
        onClose={() => setShowCustomPathModal(false)}
        onPathCreated={handleCustomPathCreated}
        searchHistory={searchHistory}
      />
    </div>
  );
};

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

// Helper function to generate tags from suggestions
function generateTagsFromSuggestions(suggestions: TopicSuggestion[]): TopicTag[] {
  const tags: TopicTag[] = [];
  
  suggestions.forEach((suggestion, index) => {
    const category = suggestion.difficulty === 'beginner' ? 'fundamental' : 
                    suggestion.difficulty === 'advanced' ? 'advanced' : 'practical';
    
    tags.push({
      id: `tag-${index}`,
      name: suggestion.title,
      category,
      color: category === 'fundamental' ? 'primary' : 
             category === 'advanced' ? 'secondary' : 'accent',
      relatedTopics: suggestion.tags || []
    });

    if (suggestion.tags) {
      suggestion.tags.forEach((tag, tagIndex) => {
        tags.push({
          id: `related-${index}-${tagIndex}`,
          name: tag,
          category: 'practical',
          color: 'accent',
          relatedTopics: [suggestion.title]
        });
      });
    }
  });

  return tags;
}

export default ChatInterface;
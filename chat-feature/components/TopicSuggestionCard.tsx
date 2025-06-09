import React from 'react';
import { Clock, TrendingUp, ChevronRight, Hash, Zap, Target, BookOpen } from 'lucide-react';
import { TopicSuggestion } from '../types';

interface TopicSuggestionCardProps {
  suggestion: TopicSuggestion;
  onClick: () => void;
}

const TopicSuggestionCard: React.FC<TopicSuggestionCardProps> = ({ 
  suggestion, 
  onClick 
}) => {
  const getDifficultyConfig = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': 
        return { 
          color: 'text-green-600 bg-green-100 border-green-200', 
          icon: <BookOpen className="w-3 h-3" />,
          emoji: '🌱'
        };
      case 'intermediate': 
        return { 
          color: 'text-secondary-600 bg-secondary-100 border-secondary-200', 
          icon: <Target className="w-3 h-3" />,
          emoji: '🚀'
        };
      case 'advanced': 
        return { 
          color: 'text-red-600 bg-red-100 border-red-200', 
          icon: <Zap className="w-3 h-3" />,
          emoji: '⚡'
        };
      default: 
        return { 
          color: 'text-gray-600 bg-gray-100 border-gray-200', 
          icon: <BookOpen className="w-3 h-3" />,
          emoji: '📚'
        };
    }
  };

  const difficultyConfig = getDifficultyConfig(suggestion.difficulty);

  return (
    <button
      onClick={onClick}
      className="group p-6 bg-white/90 backdrop-blur-sm rounded-2xl border border-orange-200/50 hover:border-primary-300 hover:shadow-xl transition-all duration-300 text-left w-full transform hover:-translate-y-1 hover:bg-white"
    >
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-bold text-gray-800 group-hover:text-primary-600 transition-colors text-lg leading-tight">
          {suggestion.title}
        </h4>
        <div className="flex-shrink-0 ml-3">
          <div className="w-10 h-10 bg-gradient-to-r from-primary-100 to-secondary-100 rounded-xl flex items-center justify-center group-hover:from-primary-200 group-hover:to-secondary-200 transition-all duration-300">
            <ChevronRight className="w-5 h-5 text-primary-600 group-hover:translate-x-0.5 transition-transform duration-300" />
          </div>
        </div>
      </div>
      
      <p className="text-gray-600 mb-4 line-clamp-2 leading-relaxed">
        {suggestion.description}
      </p>
      
      {/* Tags */}
      {suggestion.tags && suggestion.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {suggestion.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="px-3 py-1 text-xs bg-primary-50 text-primary-700 rounded-full flex items-center gap-1 border border-primary-200/50"
            >
              <Hash className="w-2.5 h-2.5" />
              {tag}
            </span>
          ))}
          {suggestion.tags.length > 3 && (
            <span className="px-3 py-1 text-xs bg-gray-50 text-gray-600 rounded-full border border-gray-200">
              +{suggestion.tags.length - 3} more
            </span>
          )}
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className={`px-3 py-1.5 text-xs font-semibold rounded-full border flex items-center gap-1.5 ${difficultyConfig.color}`}>
            <span>{difficultyConfig.emoji}</span>
            {suggestion.difficulty}
          </span>
          
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-medium">{suggestion.estimatedTime}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <TrendingUp className="w-3.5 h-3.5" />
          <span className="font-medium">{suggestion.category}</span>
        </div>
      </div>
    </button>
  );
};

export default TopicSuggestionCard;
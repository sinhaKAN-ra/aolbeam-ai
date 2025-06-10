import React, { useState } from 'react';
import { TopicSuggestion } from '../../types/chat-feature';
import { BookOpen, Zap, Clock, ArrowRight, ExternalLink, GitBranch, Brain, GraduationCap, Route } from 'lucide-react';

interface TopicSuggestionCardProps {
  suggestion: TopicSuggestion;
  onClick: (suggestion: TopicSuggestion) => void;
  isSelected?: boolean;
  showRelated?: boolean;
}

const TopicSuggestionCard: React.FC<TopicSuggestionCardProps> = ({ suggestion, onClick, isSelected = false, showRelated = false }) => {
  const [isHovered, setIsHovered] = useState(false);
  const getDifficultyColor = () => {
    switch (suggestion.difficulty?.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-700';
      case 'intermediate': return 'bg-blue-100 text-blue-700';
      case 'advanced': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Get icon based on difficulty or type
  const getIcon = () => {
    if (suggestion.icon) return suggestion.icon;
    
    switch(suggestion.difficulty) {
      case 'beginner': return <BookOpen className="w-5 h-5" />;
      case 'intermediate': return <Route className="w-5 h-5" />;
      case 'advanced': return <Brain className="w-5 h-5" />;
      default: return <GraduationCap className="w-5 h-5" />;
    }
  };
  
  return (
    <div 
      className={`group relative bg-white rounded-2xl border ${isSelected ? 'border-primary shadow-md' : 'border-gray-200'} p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full flex flex-col`}
      onClick={() => onClick(suggestion)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header with icon and title */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${suggestion.color || 'bg-gradient-to-br from-primary-100 to-primary-50 text-primary-600'}`}>
            {getIcon()}
          </div>
          <h3 className="text-lg font-bold text-gray-800 group-hover:text-primary-600 transition-colors">
            {suggestion.title}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {(suggestion.time || suggestion.estimatedTime) && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3.5 h-3.5" />
              <span>{suggestion.time || suggestion.estimatedTime}</span>
            </div>
          )}
          <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor()} font-medium`}>
            {suggestion.difficulty || 'All Levels'}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-gray-600 mb-4 flex-1">{suggestion.description}</p>
      
      {/* Learning path indicator - only shown when hovered or selected */}
      {(isHovered || isSelected) && suggestion.branches && suggestion.branches.length > 0 && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <GitBranch className="w-4 h-4 text-gray-600" />
            <span className="text-xs font-medium text-gray-700">Learning path branches:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestion.branches.map((branch: string, i: number) => (
              <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">{branch}</span>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {suggestion.tags && suggestion.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {suggestion.tags.slice(0, 3).map((tag, index) => (
            <span 
              key={index} 
              className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-full hover:bg-primary-50 hover:text-primary-700 transition-colors cursor-pointer"
            >
              {tag}
            </span>
          ))}
          {suggestion.tags.length > 3 && (
            <span className="px-2.5 py-1 bg-gray-50 text-gray-500 text-xs rounded-full">
              +{suggestion.tags.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Footer with time and action */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        {showRelated ? (
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <GitBranch className="w-4 h-4" />
            <span>Related topic</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {suggestion.difficulty && (
              <div className="flex items-center">
                <span className="w-2 h-2 rounded-full bg-primary mr-1"></span>
                <span className="text-xs text-gray-500 capitalize">{suggestion.difficulty}</span>
              </div>
            )}
          </div>
        )}
        <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-50 text-sm font-medium text-primary-600 hover:bg-primary-100 group-hover:gap-2 transition-all">
          <span>Explore</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Hover effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity pointer-events-none" />

      {/* External link indicator if available */}
      {suggestion.externalLink && (
        <div className="absolute top-3 right-3 p-1.5 bg-white/80 backdrop-blur-sm rounded-lg text-gray-500">
          <ExternalLink className="w-3.5 h-3.5" />
        </div>
      )}
    </div>
  );
};

export default TopicSuggestionCard;
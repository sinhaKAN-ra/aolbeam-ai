import React from 'react';
import { TopicSuggestion } from '../types';
import { BookOpen, Zap, Clock, ArrowRight, ExternalLink } from 'lucide-react';

interface TopicSuggestionCardProps {
  suggestion: TopicSuggestion;
  onClick: (suggestion: TopicSuggestion) => void;
}

const TopicSuggestionCard: React.FC<TopicSuggestionCardProps> = ({ suggestion, onClick }) => {
  const getDifficultyColor = () => {
    switch (suggestion.difficulty?.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-700';
      case 'intermediate': return 'bg-blue-100 text-blue-700';
      case 'advanced': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div 
      className="group relative bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full flex flex-col"
      onClick={() => onClick(suggestion)}
    >
      {/* Header with icon and title */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-primary-100 to-primary-50 rounded-xl text-primary-600">
            <BookOpen className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 group-hover:text-primary-600 transition-colors">
            {suggestion.title}
          </h3>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor()} font-medium`}>
          {suggestion.difficulty || 'All Levels'}
        </span>
      </div>

      {/* Description */}
      <p className="text-gray-600 mb-4 flex-1">{suggestion.description}</p>

      {/* Tags */}
      {suggestion.tags && suggestion.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {suggestion.tags.slice(0, 3).map((tag, index) => (
            <span 
              key={index} 
              className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer with time and action */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          <span>{suggestion.timeToLearn || 'Self-paced'}</span>
        </div>
        <button className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 group-hover:gap-2 transition-all">
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
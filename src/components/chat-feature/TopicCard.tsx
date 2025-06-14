import React from 'react';
import { TopicSuggestion } from '../../types/chat-feature';
import { BookOpen, Brain, Sparkles, Zap } from 'lucide-react';

interface TopicCardProps {
  suggestion: TopicSuggestion;
  onClick: (suggestion: TopicSuggestion) => void;
}

const TopicCard: React.FC<TopicCardProps> = ({ suggestion, onClick }) => {
  const IconComponent = suggestion.icon ? (
    // This is a simplification; a more robust solution would involve a map or direct component passing
    // For now, I'll use a switch or if-else for the known icons from the sampleSuggestions
    (() => {
      switch (suggestion.id) {
        case 'web-dev': return <BookOpen className="w-5 h-5" />;
        case 'data-science': return <Brain className="w-5 h-5" />;
        case 'ai': return <Sparkles className="w-5 h-5" />;
        case 'cloud-computing': return <Zap className="w-5 h-5" />;
        case 'machine-learning': return <Brain className="w-6 h-6 text-primary" />;
        case 'quantum-physics': return <Zap className="w-6 h-6 text-secondary" />;
        case 'data-structures-algorithms': return <Sparkles className="w-6 h-6 text-yellow-600" />;
        default: return <BookOpen className="w-5 h-5" />; // Default icon
      }
    })()
  ) : <BookOpen className="w-5 h-5" />;

  return (
    <button
      onClick={() => onClick(suggestion)}
      className={`relative flex flex-col items-start gap-3 rounded-xl p-4 text-left transition-all duration-200 ease-in-out hover:scale-[1.02] hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${suggestion.color || 'bg-white border border-gray-200'}`}
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${suggestion.color ? 'bg-opacity-20' : 'bg-gray-100'}`}>
          {IconComponent}
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{suggestion.title}</h3>
      </div>
      <p className="text-sm text-gray-600">{suggestion.description}</p>
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-gray-500">
        {suggestion.difficulty && (
          <span className={`rounded-full px-2 py-0.5 ${
            suggestion.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
            suggestion.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {suggestion.difficulty}
          </span>
        )}
        {suggestion.estimatedTime && <span>{suggestion.estimatedTime}</span>}
      </div>
    </button>
  );
};

export default TopicCard;

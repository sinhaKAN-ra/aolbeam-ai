import React from 'react';
import { Tag, X, BookOpen, Code, Layers, Zap, Clock, BarChart2, Award } from 'lucide-react';
import { TopicTag } from '../../types/chat-feature';

interface TopicTagsPanelProps {
  tags: TopicTag[];
  selectedTags: string[];
  onTagClick: (tag: TopicTag) => void;
}

const getTagColor = (category: string) => {
  switch (category) {
    case 'beginner':
      return 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200';
    case 'intermediate':
      return 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200';
    case 'advanced':
      return 'bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-200';
    case 'practical':
      return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200';
  }
};

const getTagIcon = (category: string) => {
  switch (category) {
    case 'beginner':
      return <BookOpen className="w-4 h-4 mr-1" />;
    case 'intermediate':
      return <BarChart2 className="w-4 h-4 mr-1" />;
    case 'advanced':
      return <Zap className="w-4 h-4 mr-1" />;
    case 'practical':
      return <Code className="w-4 h-4 mr-1" />;
    default:
      return <Tag className="w-4 h-4 mr-1" />;
  }
};

export const TopicTagsPanel: React.FC<TopicTagsPanelProps> = ({
  tags,
  selectedTags,
  onTagClick,
}) => {
  if (!tags || tags.length === 0) return null;

  return (
    <div className="mt-8 bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-orange-200/50 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gradient-to-r from-accent-100 to-accent-200 rounded-xl">
          <Layers className="w-5 h-5 text-accent-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-800">Explore Related Topics</h3>
      </div>
      
      <div className="flex flex-wrap gap-3">
        {tags.map((tag) => {
          const isSelected = selectedTags.includes(tag.id);
          const tagColor = getTagColor(tag.category || 'general');
          const TagIcon = getTagIcon(tag.category || 'general');
          
          return (
            <button
              key={tag.id}
              onClick={() => onTagClick(tag)}
              className={`flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border-2
                ${tagColor} 
                ${isSelected ? 'ring-2 ring-offset-2 ring-primary-400' : ''}
                hover:shadow-md transform hover:-translate-y-0.5`}
            >
              {TagIcon}
              {tag.name}
              {isSelected && (
                <X className="ml-2 w-3.5 h-3.5" />
              )}
            </button>
          );
        })}
      </div>
      
      {selectedTags.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 flex items-center">
          <Award className="w-4 h-4 mr-2 text-yellow-500" />
          <span>Selected topics will help personalize your learning experience.</span>
        </div>
      )}
    </div>
  );
};

export default TopicTagsPanel;
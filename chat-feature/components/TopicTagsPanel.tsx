import React from 'react';
import { Hash, TrendingUp, Clock, Target, Sparkles, Brain, Zap } from 'lucide-react';
import { TopicTag } from '../types';

interface TopicTagsPanelProps {
  tags: TopicTag[];
  onTagClick: (tag: TopicTag) => void;
  selectedTags: string[];
}

const TopicTagsPanel: React.FC<TopicTagsPanelProps> = ({
  tags,
  onTagClick,
  selectedTags
}) => {
  const getTagIcon = (category: string) => {
    switch (category) {
      case 'fundamental': return <Target className="w-4 h-4" />;
      case 'advanced': return <Zap className="w-4 h-4" />;
      case 'practical': return <Brain className="w-4 h-4" />;
      default: return <Hash className="w-4 h-4" />;
    }
  };

  const getCategoryConfig = (category: string) => {
    switch (category) {
      case 'fundamental': 
        return {
          color: 'bg-primary-100 text-primary-700 border-primary-200 hover:bg-primary-200',
          headerColor: 'text-primary-600',
          bgGradient: 'from-primary-50 to-primary-100'
        };
      case 'advanced': 
        return {
          color: 'bg-secondary-100 text-secondary-700 border-secondary-200 hover:bg-secondary-200',
          headerColor: 'text-secondary-600',
          bgGradient: 'from-secondary-50 to-secondary-100'
        };
      case 'practical': 
        return {
          color: 'bg-accent-100 text-accent-700 border-accent-200 hover:bg-accent-200',
          headerColor: 'text-accent-600',
          bgGradient: 'from-accent-50 to-accent-100'
        };
      default: 
        return {
          color: 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200',
          headerColor: 'text-gray-600',
          bgGradient: 'from-gray-50 to-gray-100'
        };
    }
  };

  const categoryLabels = {
    fundamental: 'Fundamental Concepts',
    advanced: 'Advanced Topics',
    practical: 'Practical Applications'
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-r from-primary-100 to-secondary-100 rounded-2xl">
          <Hash className="w-6 h-6 text-primary-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-800">Explore Related Topics</h3>
          <p className="text-gray-600">Dive deeper into connected concepts and expand your knowledge</p>
        </div>
      </div>
      
      <div className="space-y-6">
        {['fundamental', 'advanced', 'practical'].map(category => {
          const categoryTags = tags.filter(tag => tag.category === category);
          if (categoryTags.length === 0) return null;

          const config = getCategoryConfig(category);

          return (
            <div key={category} className={`bg-gradient-to-r ${config.bgGradient} rounded-2xl p-6 border border-orange-200/30`}>
              <h4 className={`text-lg font-bold ${config.headerColor} mb-4 flex items-center gap-2`}>
                {getTagIcon(category)}
                {categoryLabels[category as keyof typeof categoryLabels]}
                <span className="text-sm font-normal text-gray-500">({categoryTags.length})</span>
              </h4>
              
              <div className="flex flex-wrap gap-3">
                {categoryTags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => onTagClick(tag)}
                    className={`px-4 py-2.5 text-sm font-semibold rounded-xl border transition-all duration-300 hover:shadow-md transform hover:-translate-y-0.5 ${
                      selectedTags.includes(tag.id)
                        ? 'bg-gradient-to-r from-primary-600 to-secondary-600 text-white border-primary-600 shadow-lg'
                        : config.color
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selectedTags.length > 0 && (
        <div className="bg-gradient-to-r from-primary-50 via-secondary-50 to-accent-50 rounded-2xl p-6 border border-primary-200">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary-600" />
            <h4 className="font-bold text-primary-700">
              Active Learning Focus ({selectedTags.length} topics)
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedTags.map(tagId => {
              const tag = tags.find(t => t.id === tagId);
              return tag ? (
                <span
                  key={tagId}
                  className="px-3 py-1.5 text-sm bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-xl font-medium shadow-sm"
                >
                  {tag.name}
                </span>
              ) : null;
            })}
          </div>
          <p className="text-sm text-primary-600 mt-3 font-medium">
            🎯 You're exploring these interconnected topics to build comprehensive understanding
          </p>
        </div>
      )}
    </div>
  );
};

export default TopicTagsPanel;
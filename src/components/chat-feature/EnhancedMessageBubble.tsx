"use client"

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, PlayCircle, BookOpen, GitBranch, Tag, Route } from 'lucide-react';
import { EnhancedMessage, BranchingPath, TopicSuggestion } from '../../types/chat-feature';
import type { MessageResource } from '../../types/chat-feature';
import ReactMarkdown from 'react-markdown';

interface EnhancedMessageBubbleProps {
  message: EnhancedMessage;
  onBranchSelect?: (path: BranchingPath) => void;
  onTagSelect?: (tag: TopicSuggestion) => void;
}

const EnhancedMessageBubble: React.FC<EnhancedMessageBubbleProps> = ({
  message,
  onBranchSelect,
  onTagSelect,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedResourceType, setSelectedResourceType] = useState<string | null>(null);

  const renderResourceIcon = (type: MessageResource['type']) => {
    switch (type) {
      case 'video':
        return <PlayCircle className="w-4 h-4" />;
      case 'article':
      case 'documentation':
      case 'tutorial':
      default:
        return <BookOpen className="w-4 h-4" />;
    }
  };

  const resourceTypes = message.enhancedContent?.resources?.reduce<Set<string>>((types, resource) => {
    types.add(resource.type);
    return types;
  }, new Set());

  return (
    <div className="w-full">
      {/* Main Message Content */}
      <div className="bg-white rounded-2xl rounded-tl-sm shadow-sm overflow-hidden">
        <div className="p-6 prose prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2 prose-p:my-2 prose-strong:font-semibold prose-strong:text-gray-800 prose-ul:my-2 prose-li:my-1 max-w-none">
          <ReactMarkdown>{message.text}</ReactMarkdown>
        </div>

        {/* Expandable Content */}
        {message.enhancedContent?.detailedContent && (
          <div className="px-6 pb-4">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-orange-600 hover:text-orange-700 transition-colors text-sm font-medium"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  <span>Show Less</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  <span>Learn More</span>
                </>
              )}
            </button>

            {isExpanded && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="prose prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2 prose-p:my-2 prose-strong:font-semibold prose-strong:text-gray-800 prose-ul:my-2 prose-li:my-1 max-w-none text-gray-700">
                  <ReactMarkdown>{message.enhancedContent.detailedContent}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Resources Section */}
        {message.enhancedContent?.resources && message.enhancedContent.resources.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Additional Resources</h4>
            
            {/* Resource Type Filter */}
            {resourceTypes && resourceTypes.size > 1 && (
              <div className="flex gap-2 mb-3">
                {Array.from(resourceTypes).map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedResourceType(selectedResourceType === type ? null : type)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedResourceType === type
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            )}

            {/* Resource Links */}
            <div className="space-y-2">
              {message.enhancedContent.resources
                .filter(resource => !selectedResourceType || resource.type === selectedResourceType)
                .map((resource) => (
                  <a
                    key={resource.id}
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-primary">
                        {renderResourceIcon(resource.type)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-700 group-hover:text-primary">
                          {resource.title}
                        </div>
                        {resource.duration && (
                          <div className="text-xs text-gray-500">
                            {resource.duration}
                          </div>
                        )}
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-primary" />
                  </a>
                ))}
            </div>
          </div>
        )}

        {/* Branching Paths */}
        {message.enhancedContent?.branchingPaths && message.enhancedContent.branchingPaths.length > 0 && (
          <div className="border-t border-gray-100 pt-2">
            <h4 className="px-6 pt-4 pb-2 text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Route className="w-4 h-4 text-orange-500" />
              Continue Your Learning Journey
            </h4>
            <div className="grid grid-cols-1 gap-3 px-6 pb-6">
              {message.enhancedContent.branchingPaths.map((path) => (
                <button
                  key={path.id}
                  onClick={() => onBranchSelect?.(path)}
                  className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:border-orange-200 hover:bg-orange-50 transition-all text-left"
                >
                  <div className="flex-shrink-0 p-2 rounded-lg bg-orange-100 text-orange-600">
                    <Route className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-800">{path.title}</h5>
                    <p className="text-sm text-gray-600 mt-1">{path.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {path.difficulty}
                      </span>
                      <span className="text-xs text-gray-500">{path.estimatedTime}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Explore Related Topics Section */}
        {message.enhancedContent?.suggestions && message.enhancedContent.suggestions.length > 0 && (
          <div className="border-t border-gray-100 pt-2">
            <h4 className="px-6 pt-4 pb-2 text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Tag className="w-4 h-4 text-orange-500" />
              Explore Related Topics
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 px-6 pb-6">
              {message.enhancedContent.suggestions.map((tag: TopicSuggestion) => (
                <button
                  key={tag.id}
                  onClick={() => onTagSelect?.(tag)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-orange-50 border border-transparent hover:border-orange-100 transition-all text-left"
                >
                  <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
                    {tag.icon || <Tag className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">{tag.title}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{tag.difficulty}</span>
                      <span className="text-xs text-gray-500">{tag.time || tag.estimatedTime}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedMessageBubble;
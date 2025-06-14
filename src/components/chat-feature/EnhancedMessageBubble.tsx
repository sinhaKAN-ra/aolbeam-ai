import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { Message } from '../../types/chat-feature/index'; 
import { BranchingPath, EnhancedMessage, ResourceLink } from '../../types/chat-feature/enhanced-message'; 
import { TopicSuggestion } from '../../types/chat-feature/index'; 
import { BookOpen, Video, FileText, Globe, GitBranch, Link2, Tag, ArrowRight, ChevronRight, Sparkles } from 'lucide-react';
import StreamingText from './StreamingText';
import { fetchBraveResources } from '../../lib/braveResources';

interface EnhancedMessageBubbleProps {
  message: EnhancedMessage;
  onBranchSelect: (path: BranchingPath) => void;
  onTagSelect: (suggestion: TopicSuggestion) => void;
}

const EnhancedMessageBubble: React.FC<EnhancedMessageBubbleProps> = ({ message, onBranchSelect, onTagSelect }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedResourceType, setSelectedResourceType] = useState<string | null>(null);
  const [browserResources, setBrowserResources] = useState<ResourceLink[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  const main = message.enhancedContent?.mainContent || '';
  const detailed = message.enhancedContent?.detailedContent || '';
  let displayDetailedContent = detailed;

  // Basic check for duplication
  if (detailed.length > 0 && main.length > 0) {
    const mainNormalized = main.toLowerCase().replace(/\s+/g, ' ').trim();
    const detailedNormalized = detailed.toLowerCase().replace(/\s+/g, ' ').trim();
    
    // Check if one contains the other or they are very similar (e.g. using a simple length check or a more complex similarity score)
    if (detailedNormalized === mainNormalized || mainNormalized.includes(detailedNormalized) || detailedNormalized.includes(mainNormalized)) {
      // If detailed content is not significantly more informative (e.g., less than 50 chars longer)
      if (detailed.length < main.length + 50) { 
        displayDetailedContent = ""; // Or a placeholder like "Detailed explanation is similar to the main content."
      }
    }
  }

  // Always fetch external resources
  // useEffect(() => {
  //   const queryTerm = message.tags?.[0]?.name || message.text.split(" ").slice(0, 5).join(" ");
  //   fetchBraveResources(queryTerm).then(setExternalResources);
  // }, [message]);

  const renderResourceIcon = (type: ResourceLink['type']) => {
    const iconMap: Record<string, JSX.Element> = {
      article: <BookOpen className="w-4 h-4" />,
      video: <Video className="w-4 h-4" />,
      document: <FileText className="w-4 h-4" />,
      web_page: <Globe className="w-4 h-4" />,
      brave_search: <Globe className="w-4 h-4" />,
      documentation: <FileText className="w-4 h-4" />,
      tutorial: <Video className="w-4 h-4" />,
      default: <Link2 className="w-4 h-4" />
    };
    return iconMap[type] || iconMap.default;
  };

  const allResources = [
    // ...externalResources,
    ...(message.enhancedContent?.resources || []),
  ];

  const resourceTypes: Set<string> = allResources.length > 0
    ? new Set(allResources.map(r => r.type))
    : new Set<string>();

  const filteredResources = selectedResourceType
    ? allResources.filter(r => r.type === selectedResourceType)
    : allResources;

    console.log("filteredResources", filteredResources, resourceTypes);

  return (
    <div className="space-y-4">
      {/* Main Content */}
      <div className="text-gray-800 leading-relaxed">
        <StreamingText 
          text={message.enhancedContent?.mainContent || message.text} 
          isComplete={!message.isStreaming} 
        />
      </div>

      {/* Enhanced Content Sections */}
      {message.enhancedContent && (
        <div className="space-y-4">
          {/* Detailed Content */}
          {displayDetailedContent && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div className="prose prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2 prose-p:my-2 prose-strong:font-semibold prose-strong:text-gray-800 prose-ul:my-2 prose-li:my-1 max-w-none text-gray-700">
                <ReactMarkdown>{displayDetailedContent}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Suggestions */}
          {message.enhancedContent.suggestions && message.enhancedContent.suggestions.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-500" />
                Related Topics
              </h4>
              <div className="flex flex-wrap gap-2">
                {message.enhancedContent.suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.preventDefault();
                      console.log('Suggestion clicked:', suggestion);
                      onTagSelect(suggestion);
                    }}
                    className="group inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 rounded-full text-sm font-medium text-blue-700 transition-all duration-200 hover:shadow-md hover:scale-105"
                  >
                    <Tag className="w-3 h-3" />
                    {suggestion.title}
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Branching Paths */}
          {message.enhancedContent?.branchingPaths && message.enhancedContent.branchingPaths.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-purple-500" />
                Explore Further
              </h4>
              <div className="grid gap-2">
                {message.enhancedContent.branchingPaths.map((path, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.preventDefault();
                      console.log('Branching path clicked:', path);
                      onBranchSelect(path);
                    }}
                    className="group flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-purple-300 hover:shadow-md transition-all duration-200 text-left"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{path.title}</div>
                      {path.description && <div className="text-sm text-gray-600">{path.description}</div>}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Resources */}
          {message.enhancedContent.resources && message.enhancedContent.resources.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-green-500" />
                Additional Resources
              </h4>
              <div className="grid gap-2">
                {message.enhancedContent.resources.map((resource, index) => (
                  <a
                    key={index}
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-green-300 hover:shadow-md transition-all duration-200"
                  >
                    <div className="text-green-600">{renderResourceIcon(resource.type)}</div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 group-hover:text-green-700">{resource.title}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-green-500 transition-colors" />
                  </a>
                ))}
              </div>
            </div>
          )}
          {/* Practice Problem CTA */}
          {message.enhancedContent?.practiceProblem && 
           message.enhancedContent.practiceProblem.question && 
           message.enhancedContent.practiceProblem.question.toLowerCase() !== 'undefined' && (
            <div className="mt-4 space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-500" />
                Practice Problem
              </h4>
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-gray-700 mb-3">
                  {message.enhancedContent.practiceProblem.question}
                </p>
                <div className="flex justify-end">
                  {/* Link to the /practice page */}
                  <Link
                    href={`/#generate?topic=${encodeURIComponent(
                      message.tags?.[0]?.name ||
                      message.enhancedContent?.suggestions?.[0]?.title ||
                      message.text.split(' ').slice(0, 3).join(' ') ||
                      'general'
                    )}&problem=${encodeURIComponent(message.enhancedContent.practiceProblem.question)}`}
                    className="px-3 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-medium rounded-md hover:from-orange-600 hover:to-amber-600 shadow-sm inline-flex items-center gap-2"
                  >
                    <GitBranch className="w-4 h-4" />
                    Try Now
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedMessageBubble;
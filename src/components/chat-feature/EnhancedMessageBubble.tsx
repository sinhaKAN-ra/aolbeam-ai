import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { Message } from '@/types/chat-feature/index'; // Adjust path as needed
import { BranchingPath, EnhancedMessage, ResourceLink } from '@/types/chat-feature/enhanced-message'; // Adjust path as needed
import { TopicSuggestion } from '@/types/chat-feature/index'; // Import TopicSuggestion
import { BookOpen, Video, FileText, Globe, GitBranch, Link2 } from 'lucide-react'; // Added GitBranch
import { fetchBraveResources } from '@/lib/braveResources'; // Adjust path as needed

interface EnhancedMessageBubbleProps {
  message: EnhancedMessage;
  onBranchSelect: (path: BranchingPath) => void;
  onTagSelect: (suggestion: TopicSuggestion) => void;
}

const EnhancedMessageBubble: React.FC<EnhancedMessageBubbleProps> = ({ message, onBranchSelect, onTagSelect }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedResourceType, setSelectedResourceType] = useState<string | null>(null);
  const [externalResources, setExternalResources] = useState<ResourceLink[]>([]);

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
    switch (type) {
      case 'article':
        return <BookOpen className="w-4 h-4 text-blue-500" />;
      case 'video':
        return <Video className="w-4 h-4 text-red-500" />;
      case 'document':
        return <FileText className="w-4 h-4 text-green-500" />;
      case 'web_page':
      case 'brave_search': // Brave search results are general web pages
        return <Globe className="w-4 h-4 text-purple-500" />;
      default:
        return <Link2 className="w-4 h-4 text-gray-500" />;
    }
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
    <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-full p-4 rounded-lg shadow-md ${message.sender === 'user' ? 'bg-primary text-white' : 'bg-white text-gray-800'}`}>
        {/* Main Content */}
        <div className={`prose prose-sm max-w-none ${message.sender === 'user' ? 'prose-invert' : ''}`}>
          <ReactMarkdown>
            {message.enhancedContent?.mainContent || message.text}
          </ReactMarkdown>
        </div>

        {/* Expandable Content */}
        {/* {detailed && ( // Use 'detailed' here to check if original detailed content exists
          <div className="px-6 pb-4">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`flex items-center text-sm font-medium ${message.sender === 'user' ? 'text-blue-200 hover:text-blue-100' : 'text-blue-600 hover:text-blue-700'}`}
            >
              {isExpanded ? 'Show Less' : 'Learn More'}
            </button>

            {isExpanded && displayDetailedContent && ( // Use 'displayDetailedContent' for rendering
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="prose prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2 prose-p:my-2 prose-strong:font-semibold prose-strong:text-gray-800 prose-ul:my-2 prose-li:my-1 max-w-none text-gray-700">
                  <ReactMarkdown>{displayDetailedContent}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )} */}

        {/* Branching Paths */}
        {message.enhancedContent?.branchingPaths && message.enhancedContent.branchingPaths.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Branching Paths</h4>
            <div className="flex flex-wrap gap-2">
              {message.enhancedContent.branchingPaths.map((path, index) => (
                <button
                  key={index}
                  onClick={() => onBranchSelect(path)}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 hover:bg-purple-200"
                >
                  {path.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {message.enhancedContent?.suggestions && message.enhancedContent.suggestions.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Suggestions</h4>
            <div className="flex flex-wrap gap-2">
              {message.enhancedContent.suggestions.map((suggestion: TopicSuggestion, index) => (
                <button
                  key={index}
                  onClick={() => onTagSelect(suggestion)}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  {suggestion.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Additional Resources */}
        {allResources && allResources.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Additional Resources</h4>
            
           

            {/* Resource List */}
            <ul className="space-y-2">
              {filteredResources.map((resource: ResourceLink, index: number) => (
                <li key={resource.id || index} className="flex items-start gap-2">
                  {renderResourceIcon(resource.type)}
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {resource.title}
                    {resource.difficulty}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Practice Problem CTA */}
        {message.enhancedContent?.practiceProblem && 
         message.enhancedContent.practiceProblem.question && 
         message.enhancedContent.practiceProblem.question.toLowerCase() !== 'undefined' && (
          <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <h4 className="text-sm font-semibold text-orange-700 mb-2">Practice Problem</h4>
            <p className="text-sm text-gray-700 mb-3">
              {message.enhancedContent.practiceProblem.question}
            </p>
            {/* Link to the /practice page - this part is for navigation, not display of the question itself */}
            <div className="mt-3">
              <Link
                href={`/#generate?topic=${encodeURIComponent(
                  message.tags?.[0]?.name ||
                  message.enhancedContent?.suggestions?.[0]?.title ||
                  message.text.split(' ').slice(0, 3).join(' ') ||
                  'general'
                )}&problem=${encodeURIComponent(message.enhancedContent.practiceProblem.question)}`} // Optionally pass the problem too
                className="inline-flex items-center gap-2 text-sm font-medium text-orange-600 hover:text-orange-700"
              >
                <GitBranch className="w-4 h-4" />
                Try this practice problem
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedMessageBubble;
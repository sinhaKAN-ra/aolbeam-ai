import React from 'react';
import { EnhancedMessage, BranchingPath } from '../../types/chat-feature/enhanced-message'; 
import { TopicSuggestion } from '../../types/chat-feature/index';
import {
  MainContentSection,
  DetailedContentSection,
  SuggestionsSection,
  BranchingPathsSection,
  ResourcesSection,
  PracticeProblemSection,
  useSectionsFromMessage
} from './EnhancedMessageSections';

interface EnhancedMessageBubbleProps {
  message: EnhancedMessage;
  onBranchSelect: (path: BranchingPath) => void;
  onTagSelect: (suggestion: TopicSuggestion) => void;
}

const EnhancedMessageBubble: React.FC<EnhancedMessageBubbleProps> = ({ message, onBranchSelect, onTagSelect }) => {
  // Use the helper hook to extract all sections from the message
  const {
    main,
    detailed,
    suggestions,
    branchingPaths,
    resources,
    practiceProblems,
    topicFallback
  } = useSectionsFromMessage(message, onBranchSelect, onTagSelect);

  return (
    <div className="space-y-4">
      {/* Main Content - Always visible */}
      <MainContentSection text={main.text} isStreaming={main.isStreaming} />
      
      {/* Enhanced Content Sections - Progressively loaded */}
      <div className="space-y-4">
        {/* Detailed Content */}
        {detailed && <DetailedContentSection detailed={detailed} />}
        
        {/* Topic Suggestions */}
        <SuggestionsSection suggestions={suggestions} onTagSelect={onTagSelect} />
        
        {/* Branching Paths */}
        <BranchingPathsSection paths={branchingPaths} onSelect={onBranchSelect} />
        
        {/* Resources */}
        <ResourcesSection resources={resources} />
        
        {/* Practice Problem */}
        <PracticeProblemSection 
          practiceProblems={practiceProblems} 
          topicFallback={topicFallback} 
        />
      </div>
    </div>
  );
};

export default EnhancedMessageBubble;
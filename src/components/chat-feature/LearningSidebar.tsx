import React, { useState } from 'react';
import { 
  Route, 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  HelpCircle, 
  BookOpen, 
  GraduationCap, 
  Plus 
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LearningPath } from '@/types/chat-feature';
import { TopicTag, TopicSuggestion } from '@/types/chat-feature';
import LearningPathTracker from './LearningPathTracker';
import CustomLearningPathModal from './CustomLearningPathModal';

interface LearningSidebarProps {
  learningPath?: LearningPath;
  latestSuggestions: TopicSuggestion[];
  topicSuggestions: TopicSuggestion[];
  topicTags: TopicTag[];
  searchHistory: string[];
  selectedLearningMode: 'fundamental' | 'applied' | 'advanced';
  onLearningModeChange: (mode: 'fundamental' | 'applied' | 'advanced') => void;
  onTopicTagClick: (tag: TopicTag) => void;
  onCustomPathCreated: ((newPath: LearningPath) => void) | ((pathId: string) => void);
  selectedTags: string[];
}

export default function LearningSidebar({
  learningPath,
  latestSuggestions,
  topicSuggestions,
  topicTags,
  searchHistory,
  selectedLearningMode,
  onLearningModeChange,
  onTopicTagClick,
  onCustomPathCreated,
  selectedTags,
}: LearningSidebarProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showLearningModeTooltip, setShowLearningModeTooltip] = useState(false);
  const [showRelatedFields, setShowRelatedFields] = useState(true);
  const [isLearningPathVisible, setIsLearningPathVisible] = useState(true);
  const [showCustomPathModal, setShowCustomPathModal] = useState(false);

  const handleStepToggle = (stepId: string, completed: boolean) => {
    // Handle step toggle logic here
    console.log(`Step ${stepId} marked as ${completed ? 'completed' : 'incomplete'}`);
  };

  const handleCustomPathCreated = (newPath: LearningPath | string) => {
    setShowCustomPathModal(false);
    if (typeof onCustomPathCreated === 'function') {
      // @ts-ignore - We know the types are compatible at runtime
      onCustomPathCreated(newPath);
    }
  };

  return (
    <div 
      className={`fixed top-0 right-0 h-full border-l border-gray-200 bg-white overflow-y-auto transition-all duration-300 ease-in-out z-10 ${isSidebarCollapsed ? 'w-12' : 'w-80'}`}
      style={{ height: 'calc(100vh - 64px)', top: '64px' }}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        className="absolute -left-3 top-1/2 -translate-y-1/2 bg-white border border-gray-200 rounded-full p-1 shadow-sm hover:shadow-md transition-all z-20"
        aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isSidebarCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>
      
      {/* Expanded View Content */}
      <div className={`p-6 ${isSidebarCollapsed ? 'opacity-0 hidden' : 'opacity-100 visible'} transition-opacity duration-200`}>
        {/* Learning Mode Selector */}
        <div className="mb-6 relative">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-medium text-gray-600">Learning Mode</h3>
            <button 
              className="text-gray-400 hover:text-gray-600"
              onClick={() => setShowLearningModeTooltip(!showLearningModeTooltip)}
              onBlur={() => setTimeout(() => setShowLearningModeTooltip(false), 100)}
              aria-label="Learning mode information"
            >
              <HelpCircle size={14} />
            </button>
          </div>
          
          {showLearningModeTooltip && (
            <div className="absolute z-30 bg-white border border-gray-200 shadow-lg rounded-md p-3 mt-1 w-full text-sm">
              <h4 className="font-semibold mb-1 text-gray-800">Choose your learning style:</h4>
              <ul className="space-y-1 text-xs text-gray-600">
                <li><span className="font-semibold text-gray-700">Fundamental:</span> Core concepts and basics.</li>
                <li><span className="font-semibold text-gray-700">Applied:</span> Practical examples and use cases.</li>
                <li><span className="font-semibold text-gray-700">Advanced:</span> In-depth technical details.</li>
              </ul>
            </div>
          )}

          <div className="flex space-x-2">
            {(['fundamental', 'applied', 'advanced'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => onLearningModeChange(mode)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedLearningMode === mode
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Topic Tags */}
        {topicTags.length > 0 && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-gray-600">Topic Tags</h3>
              <button 
                onClick={() => setShowRelatedFields(!showRelatedFields)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                {showRelatedFields ? 'Hide Related' : 'Show Related'}
              </button>
            </div>
            {showRelatedFields && (
              <div className="flex flex-wrap gap-2">
                {topicTags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => onTopicTagClick(tag)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedTags.includes(tag.id) 
                        ? 'bg-primary text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Learning Journey Section */}
        {learningPath && (
          <div className={`mb-8 relative transition-all duration-300 ${isLearningPathVisible ? 'max-h-[1000px] opacity-100' : 'max-h-12 opacity-70 overflow-hidden'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                  <Route className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-800">Learning Journey</h3>
                  <p className="text-xs text-gray-500">Track your progress</p>
                </div>
              </div>
              <button
                onClick={() => setIsLearningPathVisible(!isLearningPathVisible)}
                className="text-gray-500 hover:text-gray-700"
                aria-label={isLearningPathVisible ? 'Collapse Learning Journey' : 'Expand Learning Journey'}
              >
                {isLearningPathVisible ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>

            {/* Progress Bar */}
            <div className={`mb-6 ${!isLearningPathVisible ? 'hidden' : ''}`}>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1">
                <div 
                  className="h-full bg-gradient-to-r from-orange-400 to-orange-500" 
                  style={{ width: `${(learningPath.currentStep / learningPath.totalSteps) * 100}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Step {learningPath.currentStep} of {learningPath.totalSteps}</span>
                <span>{Math.round((learningPath.currentStep / learningPath.totalSteps) * 100)}% Complete</span>
              </div>
            </div>

            {/* Current Focus */}
            <div className={`mb-6 ${!isLearningPathVisible ? 'hidden' : ''}`}>
              <h4 className="text-sm font-medium text-gray-600 mb-2">Current Focus</h4>
              <div className="p-3 border border-orange-100 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen className="w-4 h-4 text-orange-500" />
                  <h5 className="font-medium text-gray-800">
                    {learningPath.steps[learningPath.currentStep - 1]?.title || learningPath.title}
                  </h5>
                </div>
                <p className="text-xs text-gray-600 ml-6">Active learning session</p>
              </div>
            </div>
            
            {/* Learning Path Content */}
            {isLearningPathVisible && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-600 mb-3">Suggested Next Steps</h4>
                <LearningPathTracker
                  learningPath={learningPath}
                  onStepToggle={handleStepToggle}
                  className="bg-white rounded-lg shadow-sm"
                />
              </div>
            )}
            <div className={`mt-6 ${!isLearningPathVisible ? 'hidden' : ''}`}>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Create Your Own Learning Path</h3>
              <div className="flex flex-col space-y-3">
                <button
                  onClick={() => setShowCustomPathModal(true)}
                  className="flex items-center px-4 py-3 border border-primary/30 bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors text-primary"
                >
                  <Plus size={18} className="mr-2" />
                  Create Custom Learning Path
                </button>
                <p className="text-xs text-gray-600">Design your personalized learning journey with specific goals and difficulty level</p>
              </div>
            </div>
          </div>
        )}

        {/* Custom Learning Path Modal */}
        {showCustomPathModal && (
          <CustomLearningPathModal
            isOpen={true}
            onClose={() => setShowCustomPathModal(false)}
            onPathCreated={handleCustomPathCreated}
            searchHistory={searchHistory || []}
          />
        )}
      </div>

      {/* Collapsed View Icons */}
      {isSidebarCollapsed && (
        <div className="flex flex-col items-center gap-6 mt-8 p-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  onClick={() => {
                    setIsSidebarCollapsed(false);
                  }}
                  aria-label="Learning Modes"
                >
                  <GraduationCap size={20} className="text-primary" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left">Learning Modes</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {learningPath && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    onClick={() => {
                      setIsSidebarCollapsed(false);
                      setIsLearningPathVisible(true);
                    }}
                    aria-label="Learning Journey"
                  >
                    <Route size={20} className="text-orange-500" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">Learning Journey</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  onClick={() => {
                    setIsSidebarCollapsed(false);
                    setShowCustomPathModal(true);
                  }}
                  aria-label="Create Custom Path"
                >
                  <Plus size={20} className="text-primary" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left">Create Custom Path</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
}

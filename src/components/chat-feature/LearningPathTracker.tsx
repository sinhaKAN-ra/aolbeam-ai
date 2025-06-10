"use client"

// Triggering TypeScript re-evaluation

import React, { useState, useEffect } from 'react';
import { ChevronDown, CheckCircle, BookOpen, Clock, PlayCircle, GitBranch, Route, GitMerge, GitFork } from 'lucide-react';
import { LearningPath, LearningStep } from '../../types/chat-feature';

interface LearningPathTrackerProps {
  learningPath: LearningPath;
  onStepToggle?: (stepId: string, completed: boolean) => void;
  onBranchSelect?: (branchId: string) => void;
  className?: string;
}

const LearningPathTracker: React.FC<LearningPathTrackerProps> = ({
  learningPath,
  onStepToggle,
  onBranchSelect,
  className = ''
}) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(
    new Set(learningPath.steps.filter(s => s.completed).map(s => s.id))
  );
  
  // Update completed steps when learningPath prop changes
  useEffect(() => {
    setCompletedSteps(
      new Set(learningPath.steps.filter(s => s.completed).map(s => s.id))
    );
  }, [learningPath.steps]);

  const toggleStepExpansion = (stepId: string) => {
    const newSet = new Set(expandedSteps);
    if (newSet.has(stepId)) {
      newSet.delete(stepId);
    } else {
      newSet.add(stepId);
    }
    setExpandedSteps(newSet);
  };

  const toggleStepCompletion = (stepId: string) => {
    const newSet = new Set(completedSteps);
    const isCompleted = newSet.has(stepId);
    
    if (isCompleted) {
      newSet.delete(stepId);
    } else {
      newSet.add(stepId);
    }
    
    setCompletedSteps(newSet);
    onStepToggle?.(stepId, !isCompleted);
  };

  // Calculate progress percentage
  const progress = learningPath.steps.length > 0 
    ? Math.round((completedSteps.size / learningPath.steps.length) * 100) 
    : 0;

  // Group steps by category and identify potential branches
  const stepsByCategory = learningPath.steps.reduce<Record<string, LearningStep[]>>((acc, step) => {
    // Check if step has a category or branch indicator
    const category = step.category || 'Main Path';
    
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(step);
    return acc;
  }, {});
  
  // Identify branch points and merge points
  const [branchPoints, setBranchPoints] = useState<Record<string, string[]>>({}); 
  const [activeBranch, setActiveBranch] = useState<string>('Main Path');
  
  useEffect(() => {
    // Extract branch relationships from steps if they exist
    const newBranchPoints: Record<string, string[]> = {};
    
    learningPath.steps.forEach(step => {
      if (step.branches && step.branches.length > 0) {
        newBranchPoints[step.id] = step.branches;
      }
    });
    
    setBranchPoints(newBranchPoints);
  }, [learningPath.steps]);
  
  const handleBranchSelect = (branchId: string) => {
    setActiveBranch(branchId);
    if (onBranchSelect) {
      onBranchSelect(branchId);
    }
  };

  return (
    <div className={`bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-orange-200/50 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{learningPath.title}</h2>
          <p className="text-gray-600 mt-1">{learningPath.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">
            {learningPath.steps.length} {learningPath.steps.length === 1 ? 'step' : 'steps'}
          </span>
          <span className="text-sm text-gray-400">•</span>
          <span className="text-sm font-medium text-gray-600">
            {learningPath.estimatedHours} {learningPath.estimatedHours === 1 ? 'hour' : 'hours'}
          </span>
        </div>
      </div>

      {/* Difficulty and tags */}
      {/* Learning path visualization */}
      <div className="mt-4 mb-6">
        <div className="w-full bg-gray-50 rounded-xl p-3 flex items-center overflow-x-auto hide-scrollbar">
          {Object.keys(stepsByCategory).map((category, idx) => (
            <div 
              key={category} 
              onClick={() => handleBranchSelect(category)}
              className={`flex items-center ${idx > 0 ? 'ml-1' : ''}`}
            >
              {idx > 0 && <GitFork className="w-4 h-4 text-gray-400 mx-1" />}
              <div 
                className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap cursor-pointer transition-all ${activeBranch === category ? 'bg-primary text-white font-medium' : 'bg-white border text-gray-600 hover:border-primary/30'}`}
              >
                {category}
                <span className="ml-2 text-xs opacity-70">{stepsByCategory[category].length}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-6 pt-6 border-t border-gray-100 flex flex-wrap gap-2">
        {learningPath.difficulty && (
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            learningPath.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
            learningPath.difficulty === 'intermediate' ? 'bg-blue-100 text-blue-800' :
            'bg-purple-100 text-purple-800'
          }`}>
            {learningPath.difficulty.charAt(0).toUpperCase() + learningPath.difficulty.slice(1)}
          </span>
        )}
        {learningPath.tags?.map((tag) => (
          <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">
            {tag}
          </span>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm font-medium text-primary-600">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2.5 rounded-full" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
      
      {/* Steps list */}
      <div className="space-y-4">
        {Object.entries(stepsByCategory).map(([category, steps]) => (
          <div key={category} className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
              {category}
            </h3>
            <div className="space-y-2">
              {steps.map((step) => {
                const isCompleted = completedSteps.has(step.id);
                const isExpanded = expandedSteps.has(step.id);
                
                return (
                  <div key={step.id} className="rounded-lg border border-gray-200 overflow-hidden">
                    <div 
                      className={`p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors ${isCompleted ? 'bg-green-50' : ''}`}
                      onClick={() => toggleStepCompletion(step.id)}
                    >
                      <div className="flex items-center">
                        <button 
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 ${isCompleted ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}
                        >
                          {isCompleted && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                        </button>
                        <span className={`font-medium ${isCompleted ? 'text-gray-600 line-through' : 'text-gray-900'}`}>
                          {step.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Indicate if this step has branch options */}
                        {branchPoints[step.id] && branchPoints[step.id].length > 0 && (
                          <span className="flex items-center bg-orange-50 text-orange-600 px-2 py-0.5 rounded text-xs">
                            <GitBranch className="w-3 h-3 mr-1" />
                            {branchPoints[step.id].length}
                          </span>
                        )}
                        {step.estimatedTime && (
                          <span className="text-xs text-gray-500 flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {step.estimatedTime}
                          </span>
                        )}
                        <button
                          className="text-gray-400 hover:text-gray-600 p-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStepExpansion(step.id);
                          }}
                        >
                          <ChevronDown 
                            className={`w-4 h-4 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`}
                          />
                        </button>
                      </div>
                    </div>
                    
                    {isExpanded && (step.description || step.resources?.length) && (
                      <div className="px-4 pb-4 pt-2 bg-gray-50 border-t border-gray-100">
                        {step.description && (
                          <p className="text-sm text-gray-600 mb-3">{step.description}</p>
                        )}
                        
                        {step.resources && step.resources.length > 0 && (
                          <div>
                            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                              Resources
                            </h4>
                            <div className="space-y-2">
                              {step.resources.map((resource) => (
                                <a
                                  key={resource.id}
                                  href={resource.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center text-sm text-primary-600 hover:text-primary-800 hover:underline"
                                >
                                  {resource.type === 'video' ? (
                                    <PlayCircle className="w-4 h-4 mr-2" />
                                  ) : (
                                    <BookOpen className="w-4 h-4 mr-2" />
                                  )}
                                  {resource.title}
                                </a>
                              ))}
                            </div>
                            
                            {/* Branch options if available */}
                            {branchPoints[step.id] && branchPoints[step.id].length > 0 && (
                              <div className="mt-3 border-t border-gray-100 pt-3">
                                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                                  Branch Options
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {branchPoints[step.id].map((branch) => (
                                    <button
                                      key={branch}
                                      onClick={() => handleBranchSelect(branch)}
                                      className="flex items-center px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-sm transition-colors"
                                    >
                                      <GitBranch className="w-3.5 h-3.5 mr-1.5 text-gray-600" />
                                      {branch}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {/* Future: Add Step Button 
      <button className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-accent-500 to-yellow-500 text-white font-semibold rounded-xl hover:from-accent-600 hover:to-yellow-600 transition-all duration-300 shadow-md hover:shadow-lg">
        <PlusCircle size={20} /> Add New Step
      </button>
      */}
    </div>
  );
};

export default LearningPathTracker;
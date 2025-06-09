import React, { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle, Circle, Zap, Target, BookOpen, Clock, Edit3, Trash2, PlusCircle } from 'lucide-react';
import { LearningPath, LearningPathStep } from '../../types';

interface LearningPathTrackerProps {
  learningPath: LearningPath;
  // onUpdatePath?: (updatedPath: LearningPath) => void; // For future editing
  // onDeletePath?: (pathId: string) => void; // For future deletion
}

const LearningPathTracker: React.FC<LearningPathTrackerProps> = ({ learningPath }) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(
    new Set(learningPath.steps.filter(s => s.status === 'completed').map(s => s.id))
  );

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
    if (newSet.has(stepId)) {
      newSet.delete(stepId);
    } else {
      newSet.add(stepId);
      // Mark sub-tasks as completed too if any
      const step = learningPath.steps.find(s => s.id === stepId);
      step?.subTasks?.forEach(st => newSet.add(`${stepId}-${st.id}`));
    }
    setCompletedSteps(newSet);
    // Here you would typically call an update service
    // onUpdatePath?.({...learningPath, steps: updatedSteps});
  };
  
  const toggleSubTaskCompletion = (stepId: string, subTaskId: string) => {
    const fullId = `${stepId}-${subTaskId}`;
    const newSet = new Set(completedSteps);
    if (newSet.has(fullId)) {
      newSet.delete(fullId);
    } else {
      newSet.add(fullId);
    }
    setCompletedSteps(newSet);
    // Potentially update parent step status based on subtasks
  };

  const totalSteps = learningPath.steps.length;
  const completedCount = learningPath.steps.filter(s => completedSteps.has(s.id)).length;
  const progressPercentage = totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0;

  const getStepIcon = (category: string | undefined) => {
    switch (category) {
      case 'core_concept': return <BookOpen className="w-5 h-5 text-blue-500" />;
      case 'practical_exercise': return <Zap className="w-5 h-5 text-green-500" />;
      case 'project': return <Target className="w-5 h-5 text-purple-500" />;
      default: return <BookOpen className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="p-6 h-full flex flex-col bg-gradient-to-br from-orange-50 via-red-50 to-yellow-50 shadow-lg rounded-l-2xl">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl shadow-md">
                    <Target className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                    {learningPath.mainTopic}
                </h2>
            </div>
            {/* Future actions
            <div className="flex items-center gap-2">
                <button className="p-2 text-gray-500 hover:text-primary-600 transition-colors rounded-md hover:bg-primary-100"><Edit3 size={18} /></button>
                <button className="p-2 text-gray-500 hover:text-red-600 transition-colors rounded-md hover:bg-red-100"><Trash2 size={18} /></button>
            </div>
            */}
        </div>
        <p className="text-sm text-gray-600 mb-4">{learningPath.description || 'Your personalized learning journey.'}</p>
        
        <div className="mb-1 text-sm font-medium text-gray-700">
          Progress: {completedCount} / {totalSteps} steps
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4 shadow-inner">
          <div
            className="bg-gradient-to-r from-primary-500 to-secondary-500 h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        <div className="text-xs text-gray-500 flex items-center gap-2">
            <Clock size={14} />
            <span>Estimated Timeline: {learningPath.timeline || 'Self-paced'}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2 -mr-2 custom-scrollbar">
        {learningPath.steps.map((step, index) => (
          <div key={step.id} className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-orange-200/70 shadow-sm transition-all duration-300 hover:shadow-md">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleStepExpansion(step.id)}>
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleStepCompletion(step.id);
                  }}
                  className={`p-1 rounded-full transition-colors duration-200 ${
                    completedSteps.has(step.id) ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  {completedSteps.has(step.id) ? (
                    <CheckCircle className="w-5 h-5 text-white" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                <span className={`font-semibold text-gray-800 ${completedSteps.has(step.id) ? 'line-through text-gray-500' : ''}`}>
                  {index + 1}. {step.title}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {getStepIcon(step.category)}
                {expandedSteps.has(step.id) ? <ChevronDown size={20} className="text-gray-500" /> : <ChevronRight size={20} className="text-gray-500" />}
              </div>
            </div>

            {expandedSteps.has(step.id) && (
              <div className="mt-3 pl-8 space-y-3">
                <p className={`text-sm text-gray-600 ${completedSteps.has(step.id) ? 'line-through' : ''}`}>
                  {step.description}
                </p>
                {step.estimatedTime && (
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock size={12} /> {step.estimatedTime}
                    </div>
                )}
                {step.subTasks && step.subTasks.length > 0 && (
                  <div className="space-y-2 mt-2">
                    <h4 className="text-xs font-semibold text-gray-500">SUB-TASKS:</h4>
                    {step.subTasks.map((subTask) => (
                      <div key={subTask.id} className="flex items-center gap-2 pl-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSubTaskCompletion(step.id, subTask.id);
                          }}
                          className={`p-0.5 rounded-full transition-colors duration-200 ${
                            completedSteps.has(`${step.id}-${subTask.id}`) ? 'bg-green-400 hover:bg-green-500' : 'bg-gray-200 hover:bg-gray-300'
                          }`}
                        >
                          {completedSteps.has(`${step.id}-${subTask.id}`) ? (
                            <CheckCircle className="w-4 h-4 text-white" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                        <span className={`text-sm text-gray-700 ${completedSteps.has(`${step.id}-${subTask.id}`) ? 'line-through text-gray-500' : ''}`}>
                          {subTask.title}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Future: Add resource links, notes etc. */}
              </div>
            )}
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
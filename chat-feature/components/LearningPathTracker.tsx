import React from 'react';
import { CheckCircle2, Circle, Target, BookOpen, Calendar, Clock, Sparkles, Brain, Zap } from 'lucide-react';
import { LearningPath } from '../types';

interface LearningPathTrackerProps {
  learningPath: LearningPath;
}

const LearningPathTracker: React.FC<LearningPathTrackerProps> = ({ 
  learningPath 
}) => {
  const progressPercentage = (learningPath.currentStep / learningPath.totalSteps) * 100;

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white/90 backdrop-blur-xl p-6 border-b border-orange-200/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-r from-primary-600 to-secondary-600 rounded-2xl shadow-lg">
            <Target className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              {learningPath.isCustomPath ? 'Custom Learning Path' : 'Learning Journey'}
            </h2>
            <p className="text-sm text-gray-600">Track your progress</p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-3">
          <div className="bg-gradient-to-r from-orange-200 to-yellow-200 rounded-full h-3 overflow-hidden shadow-inner">
            <div 
              className="bg-gradient-to-r from-primary-600 via-secondary-500 to-accent-500 h-3 rounded-full transition-all duration-700 ease-out shadow-sm"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 font-medium">
              Step {learningPath.currentStep} of {learningPath.totalSteps}
            </span>
            <span className="text-primary-600 font-bold">
              {Math.round(progressPercentage)}% Complete
            </span>
          </div>
        </div>

        {learningPath.timeline && (
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-3 bg-gray-50 rounded-lg px-3 py-2">
            <Calendar className="w-4 h-4" />
            <span className="font-medium">Timeline: {learningPath.timeline}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 space-y-8">
        {/* Current Topic */}
        <div>
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary-600" />
            Current Focus
          </h3>
          <div className="p-4 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-2xl border border-primary-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl shadow-sm">
                <BookOpen className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <span className="font-bold text-primary-800 text-lg">{learningPath.mainTopic}</span>
                <div className="text-sm text-primary-600 mt-1">Active learning session</div>
              </div>
            </div>
          </div>
        </div>

        {/* Learning Goals */}
        {learningPath.goals && learningPath.goals.length > 0 && (
          <div>
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-secondary-600" />
              Learning Goals
            </h3>
            <div className="space-y-3">
              {learningPath.goals.map((goal, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="w-6 h-6 bg-gradient-to-r from-secondary-500 to-accent-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">{index + 1}</span>
                  </div>
                  <span className="text-gray-700 font-medium leading-relaxed">{goal}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Topics */}
        {learningPath.completedTopics.length > 0 && (
          <div>
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Completed Topics
              <span className="text-sm font-normal text-gray-500">({learningPath.completedTopics.length})</span>
            </h3>
            <div className="space-y-2">
              {learningPath.completedTopics.map((topic, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-200">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">{topic}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Next Steps */}
        {learningPath.suggestedTopics.length > 0 && (
          <div>
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent-600" />
              Suggested Next Steps
            </h3>
            <div className="space-y-4">
              {learningPath.suggestedTopics.map((suggestion) => (
                <div key={suggestion.id} className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl border border-orange-200 hover:shadow-md transition-all duration-200">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                      <Circle className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-gray-800 mb-1">
                        {suggestion.title}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span className="font-medium">{suggestion.estimatedTime}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          <span className="font-medium capitalize">{suggestion.difficulty}</span>
                        </div>
                      </div>
                      {suggestion.tags && suggestion.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {suggestion.tags.slice(0, 2).map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded-lg font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                          {suggestion.tags.length > 2 && (
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-lg">
                              +{suggestion.tags.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LearningPathTracker;
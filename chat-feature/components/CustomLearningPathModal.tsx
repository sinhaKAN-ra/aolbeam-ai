import React, { useState, useEffect } from 'react';
import { X, Plus, Target, Clock, Calendar, BookOpen, Sparkles, Brain, CheckCircle2, ArrowRight, Zap } from 'lucide-react';
import { CustomLearningGoal } from '../types';
import { learningPathService } from '../services/learningPathService';

interface CustomLearningPathModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPathCreated: (pathId: string) => void;
  searchHistory: string[];
}

const CustomLearningPathModal: React.FC<CustomLearningPathModalProps> = ({
  isOpen,
  onClose,
  onPathCreated,
  searchHistory
}) => {
  const [step, setStep] = useState(1);
  const [goals, setGoals] = useState<CustomLearningGoal[]>([]);
  const [currentGoal, setCurrentGoal] = useState<Partial<CustomLearningGoal>>({
    title: '',
    description: '',
    difficulty: 'beginner',
    estimatedHours: 10,
    topics: []
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createdPath, setCreatedPath] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setCreatedPath(null);
      if (searchHistory.length > 0 && goals.length === 0) {
        const recentTopics = searchHistory.slice(0, 3);
        setCurrentGoal(prev => ({
          ...prev,
          topics: recentTopics
        }));
      }
    }
  }, [isOpen, searchHistory]);

  const addGoal = () => {
    if (!currentGoal.title || !currentGoal.description) return;

    const newGoal: CustomLearningGoal = {
      id: Date.now().toString(),
      title: currentGoal.title!,
      description: currentGoal.description!,
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      topics: currentGoal.topics || [],
      difficulty: currentGoal.difficulty as any,
      estimatedHours: currentGoal.estimatedHours || 10
    };

    setGoals([...goals, newGoal]);
    setCurrentGoal({
      title: '',
      description: '',
      difficulty: 'beginner',
      estimatedHours: 10,
      topics: []
    });
  };

  const removeGoal = (goalId: string) => {
    setGoals(goals.filter(g => g.id !== goalId));
  };

  const createCustomPath = async () => {
    if (goals.length === 0) return;

    setIsCreating(true);
    try {
      const customPath = await learningPathService.createCustomLearningPath(
        goals,
        searchHistory
      );
      setCreatedPath(customPath);
      setStep(3);
    } catch (error) {
      console.error('Error creating custom learning path:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const addTopicToCurrentGoal = (topic: string) => {
    if (!currentGoal.topics?.includes(topic)) {
      setCurrentGoal(prev => ({
        ...prev,
        topics: [...(prev.topics || []), topic]
      }));
    }
  };

  const removeTopicFromCurrentGoal = (topic: string) => {
    setCurrentGoal(prev => ({
      ...prev,
      topics: prev.topics?.filter(t => t !== topic) || []
    }));
  };

  const handleFinish = () => {
    if (createdPath) {
      onPathCreated(createdPath.id);
    }
    onClose();
    setGoals([]);
    setStep(1);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 via-secondary-500 to-accent-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                <Target className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Create Your Learning Path</h2>
                <p className="text-white/80">Design a personalized learning journey</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center gap-4 mt-6">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                  step >= stepNum 
                    ? 'bg-white text-primary-600 shadow-lg' 
                    : 'bg-white/20 text-white/60'
                }`}>
                  {step > stepNum ? <CheckCircle2 className="w-5 h-5" /> : stepNum}
                </div>
                {stepNum < 3 && (
                  <div className={`w-12 h-1 rounded-full transition-all duration-300 ${
                    step > stepNum ? 'bg-white' : 'bg-white/20'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Step 1: Add Goals */}
          {step === 1 && (
            <div className="p-8 space-y-8">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Define Your Learning Goals</h3>
                <p className="text-gray-600">What do you want to achieve? Set specific, measurable goals.</p>
              </div>

              {/* Search History Suggestions */}
              {searchHistory.length > 0 && (
                <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl p-6">
                  <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-accent-600" />
                    Quick Add from Recent Topics
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {searchHistory.slice(0, 8).map((topic, index) => (
                      <button
                        key={index}
                        onClick={() => addTopicToCurrentGoal(topic)}
                        className="px-4 py-2 text-sm bg-white hover:bg-accent-100 text-gray-700 hover:text-accent-700 rounded-xl transition-all duration-200 border border-orange-200 hover:border-accent-300 shadow-sm hover:shadow-md"
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Add New Goal Form */}
              <div className="bg-gray-50 rounded-2xl p-6 space-y-6">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary-600" />
                  Add Learning Goal
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Goal Title
                    </label>
                    <input
                      type="text"
                      value={currentGoal.title || ''}
                      onChange={(e) => setCurrentGoal(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                      placeholder="e.g., Master React Hooks"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Difficulty Level
                    </label>
                    <select
                      value={currentGoal.difficulty || 'beginner'}
                      onChange={(e) => setCurrentGoal(prev => ({ ...prev, difficulty: e.target.value as any }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="beginner">🌱 Beginner</option>
                      <option value="intermediate">🚀 Intermediate</option>
                      <option value="advanced">⚡ Advanced</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={currentGoal.description || ''}
                    onChange={(e) => setCurrentGoal(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                    rows={3}
                    placeholder="Describe what you want to achieve..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Estimated Hours
                  </label>
                  <input
                    type="number"
                    value={currentGoal.estimatedHours || 10}
                    onChange={(e) => setCurrentGoal(prev => ({ ...prev, estimatedHours: parseInt(e.target.value) }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                    min="1"
                    max="200"
                  />
                </div>

                {/* Selected Topics */}
                {currentGoal.topics && currentGoal.topics.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Selected Topics
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {currentGoal.topics.map((topic, index) => (
                        <span
                          key={index}
                          className="px-3 py-1.5 text-sm bg-primary-100 text-primary-700 rounded-xl flex items-center gap-2 border border-primary-200"
                        >
                          {topic}
                          <button
                            onClick={() => removeTopicFromCurrentGoal(topic)}
                            className="hover:text-primary-900 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={addGoal}
                  disabled={!currentGoal.title || !currentGoal.description}
                  className="w-full px-6 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-xl hover:from-primary-700 hover:to-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 font-semibold shadow-lg hover:shadow-xl"
                >
                  <Plus className="w-5 h-5" />
                  Add Goal
                </button>
              </div>

              {/* Added Goals List */}
              {goals.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Target className="w-5 h-5 text-secondary-600" />
                    Your Learning Goals ({goals.length})
                  </h4>
                  <div className="space-y-3">
                    {goals.map((goal) => (
                      <div key={goal.id} className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="font-semibold text-gray-800">{goal.title}</h5>
                            <p className="text-sm text-gray-600 mt-1">{goal.description}</p>
                            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {goal.estimatedHours}h
                              </span>
                              <span className="flex items-center gap-1">
                                <BookOpen className="w-3 h-3" />
                                {goal.difficulty}
                              </span>
                              <span className="flex items-center gap-1">
                                <Target className="w-3 h-3" />
                                {goal.topics.length} topics
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => removeGoal(goal.id)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4 text-gray-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Review & Create */}
          {step === 2 && (
            <div className="p-8 space-y-8">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Review Your Learning Path</h3>
                <p className="text-gray-600">Confirm your goals and create your personalized learning journey.</p>
              </div>

              <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-2xl p-6">
                <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary-600" />
                  Learning Path Summary
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div className="bg-white rounded-xl p-4">
                    <div className="text-2xl font-bold text-primary-600">{goals.length}</div>
                    <div className="text-sm text-gray-600">Learning Goals</div>
                  </div>
                  <div className="bg-white rounded-xl p-4">
                    <div className="text-2xl font-bold text-secondary-600">
                      {goals.reduce((sum, goal) => sum + goal.estimatedHours, 0)}h
                    </div>
                    <div className="text-sm text-gray-600">Total Hours</div>
                  </div>
                  <div className="bg-white rounded-xl p-4">
                    <div className="text-2xl font-bold text-accent-600">
                      {Math.ceil(goals.reduce((sum, goal) => sum + goal.estimatedHours, 0) / 10)}
                    </div>
                    <div className="text-sm text-gray-600">Weeks</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {goals.map((goal, index) => (
                  <div key={goal.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h5 className="font-semibold text-gray-800 mb-2">{goal.title}</h5>
                        <p className="text-gray-600 mb-3">{goal.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {goal.topics.map((topic, topicIndex) => (
                            <span
                              key={topicIndex}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && createdPath && (
            <div className="p-8 text-center space-y-8">
              <div className="space-y-4">
                <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800">Learning Path Created!</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Your personalized learning journey has been created and saved. You can now start learning!
                </p>
              </div>

              <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-2xl p-6 max-w-md mx-auto">
                <h4 className="font-semibold text-gray-800 mb-4">{createdPath.mainTopic}</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Total Steps:</span>
                    <span className="font-semibold">{createdPath.totalSteps}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Timeline:</span>
                    <span className="font-semibold">{createdPath.timeline}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Goals:</span>
                    <span className="font-semibold">{createdPath.goals?.length || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex justify-between">
            {step === 1 && (
              <>
                <button
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={goals.length === 0}
                  className="px-8 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-xl hover:from-primary-700 hover:to-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
                >
                  Back
                </button>
                <button
                  onClick={createCustomPath}
                  disabled={isCreating}
                  className="px-8 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-xl hover:from-primary-700 hover:to-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl"
                >
                  {isCreating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Create Learning Path
                    </>
                  )}
                </button>
              </>
            )}

            {step === 3 && (
              <button
                onClick={handleFinish}
                className="w-full px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-300 flex items-center justify-center gap-2 font-semibold shadow-lg hover:shadow-xl"
              >
                <CheckCircle2 className="w-5 h-5" />
                Start Learning Journey
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomLearningPathModal;
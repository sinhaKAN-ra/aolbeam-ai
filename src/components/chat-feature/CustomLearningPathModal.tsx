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
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
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
        // userId will be handled later
      );
      setCreatedPath(customPath);
      setStep(3); // Move to confirmation step
    } catch (error) {
      console.error('Error creating custom learning path:', error);
      // Handle error display if needed
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
    setGoals([]); // Reset goals for next time
    setStep(1);   // Reset step for next time
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

        <div className="overflow-y-auto max-h-[calc(90vh-200px)]"> {/* Adjusted height for scroll */}
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
                      placeholder="e.g., Master React Fundamentals"
                      value={currentGoal.title}
                      onChange={(e) => setCurrentGoal(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Estimated Hours
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={currentGoal.estimatedHours}
                      onChange={(e) => setCurrentGoal(prev => ({ ...prev, estimatedHours: parseInt(e.target.value) || 10 }))}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    placeholder="Briefly describe this goal..."
                    value={currentGoal.description}
                    onChange={(e) => setCurrentGoal(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none transition-colors min-h-[80px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Key Topics (comma-separated or add from history)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Components, State, Props"
                    value={currentGoal.topics?.join(', ')}
                    onChange={(e) => setCurrentGoal(prev => ({ ...prev, topics: e.target.value.split(',').map(t => t.trim()).filter(t => t) }))}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none transition-colors"
                  />
                  {currentGoal.topics && currentGoal.topics.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {currentGoal.topics.map(topic => (
                        <span key={topic} className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm flex items-center gap-1">
                          {topic}
                          <button onClick={() => removeTopicFromCurrentGoal(topic)} className="text-primary-500 hover:text-primary-700">
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Difficulty Level
                  </label>
                  <select
                    value={currentGoal.difficulty}
                    onChange={(e) => setCurrentGoal(prev => ({ ...prev, difficulty: e.target.value as any }))}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none transition-colors"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <button
                  onClick={addGoal}
                  disabled={!currentGoal.title || !currentGoal.description}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-xl hover:from-primary-700 hover:to-secondary-700 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-60"
                >
                  <Plus className="w-5 h-5" /> Add Goal
                </button>
              </div>

              {/* Added Goals List */}
              {goals.length > 0 && (
                <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
                  <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    Your Learning Goals ({goals.length})
                  </h4>
                  {goals.map(goal => (
                    <div key={goal.id} className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm flex justify-between items-start">
                      <div>
                        <h5 className="font-bold text-gray-800">{goal.title}</h5>
                        <p className="text-sm text-gray-600">{goal.description}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                          <span><Clock size={14} /> {goal.estimatedHours} hrs</span>
                          <span className="capitalize"><Zap size={14} /> {goal.difficulty}</span>
                        </div>
                        {goal.topics.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {goal.topics.map(t => <span key={t} className="text-xs bg-gray-100 px-2 py-0.5 rounded">{t}</span>)}
                          </div>
                        )}
                      </div>
                      <button onClick={() => removeGoal(goal.id)} className="text-red-500 hover:text-red-700 p-1">
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Review and Confirm */}
          {step === 2 && (
            <div className="p-8 space-y-8">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Review Your Path</h3>
                <p className="text-gray-600">Ensure your goals are set correctly before creating the path.</p>
              </div>
              {goals.map(goal => (
                <div key={goal.id} className="p-6 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl border border-orange-200/50">
                  <h4 className="font-bold text-gray-800 text-lg mb-2">{goal.title}</h4>
                  <p className="text-gray-600 mb-3">{goal.description}</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-gray-500" /> Estimated: {goal.estimatedHours} hours</div>
                    <div className="flex items-center gap-2 capitalize"><Zap className="w-4 h-4 text-gray-500" /> Difficulty: {goal.difficulty}</div>
                  </div>
                  {goal.topics.length > 0 && (
                    <div className="mt-3">
                      <h5 className="text-sm font-semibold text-gray-700 mb-1">Key Topics:</h5>
                      <div className="flex flex-wrap gap-2">
                        {goal.topics.map(topic => (
                          <span key={topic} className="px-3 py-1 bg-white text-gray-700 rounded-full text-xs border border-gray-200">{topic}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {goals.length === 0 && (
                 <p className="text-center text-gray-500 py-8">No goals added yet. Go back to Step 1 to add some learning goals.</p>
              )}
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <div className="p-8 text-center space-y-6">
              <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto animate-pulse" />
              <h3 className="text-3xl font-bold text-gray-800">Learning Path Created!</h3>
              <p className="text-gray-600 text-lg max-w-md mx-auto">
                Your personalized learning path "{createdPath?.mainTopic || 'Custom Journey'}" is ready. 
                You can now close this window and see it in your learning tracker.
              </p>
              <div className="p-6 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-2xl border border-primary-200/50">
                <h4 className="font-bold text-primary-700 text-xl mb-2">{createdPath?.mainTopic}</h4>
                <p className="text-primary-600 mb-1">Total Steps: {createdPath?.totalSteps}</p>
                <p className="text-primary-600">Estimated Timeline: {createdPath?.timeline}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end items-center gap-4">
          {step === 1 && (
            <>
              <button
                onClick={onClose}
                className="px-6 py-3 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={goals.length === 0}
                className="px-8 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-semibold rounded-xl hover:from-primary-700 hover:to-secondary-700 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-60 flex items-center gap-2"
              >
                Next: Review Path <ArrowRight className="w-5 h-5" />
              </button>
            </>
          )}
          {step === 2 && (
            <>
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
              >
                Back to Goals
              </button>
              <button
                onClick={createCustomPath}
                disabled={isCreating || goals.length === 0}
                className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-60 flex items-center gap-2"
              >
                {isCreating ? (
                  <Brain className="w-5 h-5 animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
                {isCreating ? 'Creating Path...' : 'Create Learning Path'}
              </button>
            </>
          )}
          {step === 3 && (
            <button
              onClick={handleFinish}
              className="px-8 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-semibold rounded-xl hover:from-primary-700 hover:to-secondary-700 transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2"
            >
              Finish & View Path <CheckCircle2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomLearningPathModal;
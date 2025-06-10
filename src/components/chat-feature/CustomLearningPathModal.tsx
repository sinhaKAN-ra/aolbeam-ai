"use client"

import React, { useState, useEffect } from 'react';
import { X, Plus, Target, Clock, Calendar, BookOpen, Sparkles, Brain, CheckCircle2, ArrowRight, Zap, Loader2 } from 'lucide-react';
import { CustomLearningGoal } from '../../types/chat-feature';
import { learningPathService } from '../../services/chat-feature/learningPathService';

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
      estimatedHours: currentGoal.estimatedHours || 10,
      priority: 'medium'
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
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-secondary p-6 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-foreground/20 rounded-2xl backdrop-blur-sm">
                <Target className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Create Your Learning Path</h2>
                <p className="text-primary-foreground/80">Design a personalized learning journey</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-primary-foreground/20 rounded-xl transition-colors"
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
                    ? 'bg-primary-foreground text-primary shadow-lg' 
                    : 'bg-primary-foreground/20 text-primary-foreground/60'
                }`}>
                  {step > stepNum ? <CheckCircle2 className="w-5 h-5" /> : stepNum}
                </div>
                {stepNum < 3 && (
                  <div className={`w-12 h-1 rounded-full transition-all duration-300 ${
                    step > stepNum ? 'bg-primary-foreground' : 'bg-primary-foreground/20'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Step 1: Add Goals */}
          {step === 1 && (
            <>
              <div className="text-center">
                <h3 className="text-2xl font-bold text-foreground mb-2">Define Your Learning Goals</h3>
                <p className="text-muted-foreground">What do you want to achieve? Set specific, measurable goals.</p>
              </div>

              {/* Search History Suggestions */}
              {searchHistory.length > 0 && (
                <div className="bg-card-foreground/5 rounded-2xl p-6 border border-border">
                  <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-accent" />
                    Quick Add from Recent Topics
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {searchHistory.slice(0, 8).map((topic, index) => (
                      <button
                        key={index}
                        onClick={() => addTopicToCurrentGoal(topic)}
                        className="px-4 py-2 text-sm bg-background hover:bg-accent/10 text-foreground hover:text-accent rounded-xl transition-all duration-200 border border-border hover:border-accent shadow-sm hover:shadow-md"
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Add New Goal Form */}
              <div className="bg-muted/20 rounded-2xl p-6 space-y-6 border border-border">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary" />
                  Add Learning Goal
                </h4>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="goal-title" className="block text-sm font-medium text-foreground mb-1">Goal Title</label>
                    <input
                      type="text"
                      id="goal-title"
                      value={currentGoal.title || ''}
                      onChange={(e) => setCurrentGoal({ ...currentGoal, title: e.target.value })}
                      placeholder="e.g., Master React Hooks"
                      className="w-full p-3 rounded-lg bg-input border border-border focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder-muted-foreground"
                    />
                  </div>
                  <div>
                    <label htmlFor="goal-description" className="block text-sm font-medium text-foreground mb-1">Description</label>
                    <textarea
                      id="goal-description"
                      value={currentGoal.description || ''}
                      onChange={(e) => setCurrentGoal({ ...currentGoal, description: e.target.value })}
                      placeholder="What specific skills will you gain?"
                      rows={3}
                      className="w-full p-3 rounded-lg bg-input border border-border focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder-muted-foreground"
                    ></textarea>
                  </div>
                  <div>
                    <label htmlFor="goal-difficulty" className="block text-sm font-medium text-foreground mb-1">Difficulty</label>
                    <select
                      id="goal-difficulty"
                      value={currentGoal.difficulty || 'beginner'}
                      onChange={(e) => setCurrentGoal({ ...currentGoal, difficulty: e.target.value as 'beginner' | 'intermediate' | 'advanced' })}
                      className="w-full p-3 rounded-lg bg-input border border-border focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="goal-hours" className="block text-sm font-medium text-foreground mb-1">Estimated Hours</label>
                    <input
                      type="number"
                      id="goal-hours"
                      value={currentGoal.estimatedHours || 10}
                      onChange={(e) => setCurrentGoal({ ...currentGoal, estimatedHours: parseInt(e.target.value) })}
                      className="w-full p-3 rounded-lg bg-input border border-border focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                    />
                  </div>
                  <div>
                    <label htmlFor="goal-topics" className="block text-sm font-medium text-foreground mb-1">Key Topics (comma-separated)</label>
                    <input
                      type="text"
                      id="goal-topics"
                      value={currentGoal.topics?.join(', ') || ''}
                      onChange={(e) => setCurrentGoal({ ...currentGoal, topics: e.target.value.split(',').map(t => t.trim()).filter(t => t) })}
                      placeholder="e.g., JavaScript, State Management, API Integration"
                      className="w-full p-3 rounded-lg bg-input border border-border focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder-muted-foreground"
                    />
                  </div>
                </div>
                <button
                  onClick={addGoal}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors duration-200"
                >
                  <Plus className="w-5 h-5" /> Add Goal
                </button>
              </div>

              {/* Current Goals List */}
              {goals.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-secondary" />
                    Your Learning Goals
                  </h4>
                  {goals.map((goal) => (
                    <div key={goal.id} className="bg-muted/20 rounded-2xl p-6 border border-border flex justify-between items-start">
                      <div>
                        <h5 className="font-bold text-lg text-foreground mb-1">{goal.title}</h5>
                        <p className="text-sm text-muted-foreground mb-2">{goal.description}</p>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {goal.estimatedHours} hrs</span>
                          <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {goal.difficulty}</span>
                          {goal.topics && goal.topics.length > 0 && (
                            <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {goal.topics.join(', ')}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeGoal(goal.id)}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end mt-8">
                <button
                  onClick={() => setStep(2)}
                  disabled={goals.length === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next: Review Path <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </>
          )}

          {/* Step 2: Review & Create */}
          {step === 2 && (
            <>
              <div className="text-center">
                <h3 className="text-2xl font-bold text-foreground mb-2">Review Your Learning Path</h3>
                <p className="text-muted-foreground">Confirm your goals before creating your personalized path.</p>
              </div>

              <div className="space-y-4">
                {goals.map((goal) => (
                  <div key={goal.id} className="bg-muted/20 rounded-2xl p-6 border border-border">
                    <h5 className="font-bold text-lg text-foreground mb-1">{goal.title}</h5>
                    <p className="text-sm text-muted-foreground mb-2">{goal.description}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {goal.estimatedHours} hrs</span>
                      <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {goal.difficulty}</span>
                      {goal.topics && goal.topics.length > 0 && (
                        <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {goal.topics.join(', ')}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 px-6 py-3 bg-muted text-muted-foreground rounded-lg hover:bg-muted/90 transition-colors duration-200"
                >
                  <ArrowRight className="w-5 h-5 rotate-180" /> Back to Goals
                </button>
                <button
                  onClick={createCustomPath}
                  disabled={isCreating}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Creating...
                    </>
                  ) : (
                    <>
                      Create Path <Sparkles className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <div className="text-center p-8">
              <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-6 animate-bounce" />
              <h3 className="text-3xl font-bold text-foreground mb-3">Learning Path Created!</h3>
              <p className="text-muted-foreground text-lg mb-8">Your personalized learning journey is ready.</p>
              <button
                onClick={handleFinish}
                className="flex items-center justify-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors duration-200 text-lg font-semibold mx-auto"
              >
                Start Learning Now <ArrowRight className="w-6 h-6" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper to generate tags if not provided by AI (for demo) - This function is not used in this component.
// const generateTagsFromSuggestions = (suggestions: any[]): TopicTag[] => {
//   if (!suggestions || suggestions.length === 0) return [];
  
//   const allSuggestionTags = suggestions.flatMap(s => s.tags || []);
//   const uniqueTags = Array.from(new Set(allSuggestionTags.slice(0, 10))); 

//   return uniqueTags.map((tag, index) => ({
//     id: `generated-${index}`,
//     name: tag,
//     category: ['fundamental', 'advanced', 'practical'][index % 3],
//     color: ['bg-primary/10', 'bg-secondary/10', 'bg-accent/10'][index % 3],
//     relatedTopics: suggestions.map(s => s.title)
//   }));
// };

export default CustomLearningPathModal;
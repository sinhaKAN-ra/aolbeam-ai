"use client";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { X, Plus, ArrowRight, Clock, Zap, AlertCircle, Sparkles, Trash2, Book, BookOpen, Check, Clipboard, CheckCircle2, Loader2, Brain } from "lucide-react";
import { CustomLearningGoal, LearningPath, LearningStep } from '../../types/chat-feature/chat-feature';
import { useToast } from '@/hooks/use-toast';

interface CustomLearningPathModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (goals: CustomLearningGoal[]) => void;
  initialGoals?: CustomLearningGoal[];
  topic?: string;
  searchHistory?: string[];
  existingPath?: LearningPath;
}

const CustomLearningPathModal: React.FC<CustomLearningPathModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialGoals = [],
  topic = '',
  searchHistory = [],
  existingPath
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [goals, setGoals] = useState<CustomLearningGoal[]>(initialGoals);
  const [error, setError] = useState<string | null>(null);

  const initialGoal: CustomLearningGoal = {
    id: '',
    title: topic || '',
    description: '',
    targetDate: undefined,
    topics: [],
    estimatedHours: existingPath?.estimated_hours || 10,
    difficulty: 'beginner',
    priority: 'medium'
  };

  const [currentGoal, setCurrentGoal] = useState<CustomLearningGoal>(initialGoal);
  const [isCreating, setIsCreating] = useState(false);
  const [generatedSteps, setGeneratedSteps] = useState<LearningStep[]>([]);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: boolean}>({});
  const [conversionStatus, setConversionStatus] = useState('idle'); // idle, converting, success, failed

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setGoals(initialGoals);
      setCurrentGoal({ ...initialGoal, title: topic || '' });
      setError(null);
      setValidationErrors({});
      setConversionStatus('idle');
      setGeneratedSteps([]);
      
      // If editing an existing path, initialize from it
      if (existingPath) {
        // Convert existing learning path steps to custom goals if needed
        if (initialGoals.length === 0 && existingPath.steps.length > 0) {
          const firstStep = existingPath.steps[0];
          const mainGoal: CustomLearningGoal = {
            id: Date.now().toString(),
            title: existingPath.title || firstStep.title,
            description: existingPath.description || firstStep.description,
            targetDate: undefined,
            topics: existingPath.steps.map(step => step.title),
            estimatedHours: existingPath.estimated_hours || 10,
            difficulty: firstStep.difficulty || 'beginner',
            priority: 'medium'
          };
          
          setGoals([mainGoal]);
        }
      }
    }
  }, [isOpen, initialGoals, topic, existingPath]);

  useEffect(() => {
    if (isOpen && searchHistory && searchHistory.length > 0 && !topic) {
      const recentTopics = searchHistory.slice(0, 3);
      setCurrentGoal(prev => ({ ...prev, topics: recentTopics }));
    }
  }, [isOpen, searchHistory, topic]);

  const validateGoal = (goal: CustomLearningGoal): { isValid: boolean; errors: {[key: string]: boolean} } => {
    const errors: {[key: string]: boolean} = {};
    
    if (!goal.title || goal.title.trim() === '') {
      errors.title = true;
    }
    
    if (!goal.topics || goal.topics.length === 0) {
      errors.topics = true;
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };

  const addGoal = () => {
    const { isValid, errors } = validateGoal(currentGoal);
    
    if (!isValid) {
      setValidationErrors(errors);
      toast({ 
        title: "Missing information", 
        description: "Please fill in all required fields for your learning goal.", 
        variant: "destructive" 
      });
      return;
    }
    
    setValidationErrors({});
    const newGoal: CustomLearningGoal = { ...currentGoal, id: Date.now().toString() };
    setGoals(prev => [...prev, newGoal]);
    setCurrentGoal({
      ...initialGoal,
      topics: [], // Reset topics for the next goal
      title: '' // Reset title for the next goal
    });
    toast({ title: "Goal added", description: `"${newGoal.title}" has been added to your learning path.` });
  };

  const removeGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
    toast({ title: "Goal removed", description: "Learning goal has been removed from your path." });
  };

  const convertGoalsToSteps = (): LearningStep[] => {
    let steps: LearningStep[] = [];
    let order = 0;
    
    // Convert each goal to learning steps
    goals.forEach((goal) => {
      // Create a main step from the goal itself
      const mainStep: LearningStep = {
        id: `step-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        title: goal.title,
        description: goal.description || '',
        completed: false,
        order: order++,
        estimatedTime: `${goal.estimatedHours || 1} hours`,
        difficulty: goal.difficulty
      };
      steps.push(mainStep);
      
      // Create sub-steps from each topic
      if (goal.topics && goal.topics.length > 0) {
        goal.topics.forEach((topic) => {
          // Skip if the topic is the same as the goal title
          if (topic.toLowerCase() === goal.title.toLowerCase()) return;
          
          const topicStep: LearningStep = {
            id: `step-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            title: topic,
            description: `A sub-topic of ${goal.title}`,
            completed: false,
            order: order++,
            category: goal.title, // Group by parent goal
            difficulty: goal.difficulty
          };
          steps.push(topicStep);
        });
      }
    });
    
    return steps;
  };

  const validateBeforeSubmit = (): boolean => {
    if (goals.length === 0) {
      toast({ 
        title: "No goals defined", 
        description: "Please add at least one learning goal to create a path.", 
        variant: "destructive" 
      });
      return false;
    }
    return true;
  };

  const handleCreatePath = async () => {
    if (!user) {
      toast({ 
        title: "Authentication required", 
        description: "You need to be logged in to create a learning path.", 
        variant: "destructive" 
      });
      return;
    }
    
    if (!validateBeforeSubmit()) return;
    
    setIsCreating(true);
    setError(null);
    setConversionStatus('converting');
    
    try {
      // Convert goals to learning steps for preview
      const steps = convertGoalsToSteps();
      setGeneratedSteps(steps);
      
      // The onSubmit function is now expected to handle the async creation
      await onSubmit(goals);
      setConversionStatus('success');
      setStep(3);
    } catch (error) {
      console.error('Error during path creation submission:', error);
      setError(typeof error === 'string' ? error : 'Failed to submit learning path. Please try again.');
      setConversionStatus('failed');
      toast({ 
        title: 'Error', 
        description: 'Failed to create learning path. Please try again.', 
        variant: 'destructive' 
      });
    } finally {
      setIsCreating(false);
    }
  };

  const addTopicToCurrentGoal = (topic: string) => {
    if (!topic || topic.trim() === '') return;
    
    if (!currentGoal.topics?.includes(topic)) {
      setCurrentGoal(prev => ({ 
        ...prev, 
        topics: [...(prev.topics || []), topic] 
      }));
      setValidationErrors(prev => ({ ...prev, topics: false }));
    }
  };
  
  const removeTopicFromCurrentGoal = (topicToRemove: string) => {
    setCurrentGoal(prev => ({ 
      ...prev, 
      topics: prev.topics.filter(topic => topic !== topicToRemove) 
    }));
  };

  const handleFinish = () => {
    onClose();
  };
  
  const handleRetry = () => {
    setError(null);
    setConversionStatus('idle');
    setStep(2);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="bg-gradient-to-r from-primary to-secondary p-6 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-foreground/20 rounded-2xl backdrop-blur-sm"><Sparkles className="w-8 h-8" /></div>
              <div>
                <h2 className="text-2xl font-bold">
                  {existingPath ? 'Edit Learning Path' : initialGoals?.length ? 'Edit Custom Learning Path' : 'Create Custom Learning Path'}
                </h2>
                <p className="text-primary-foreground/80">Design a personalized learning journey</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-3 bg-primary-foreground/20 rounded-full backdrop-blur-sm hover:bg-primary-foreground/30 transition-colors"
              aria-label="Close modal"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-4 mt-6">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${step >= stepNum ? 'bg-primary-foreground text-primary shadow-lg' : 'bg-primary-foreground/20 text-primary-foreground/60'}`}>
                  {step > stepNum ? <CheckCircle2 className="w-5 h-5" /> : stepNum}
                </div>
                {stepNum < 3 && <div className={`w-12 h-1 rounded-full transition-all duration-300 ${step > stepNum ? 'bg-primary-foreground' : 'bg-primary-foreground/20'}`} />}
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {step === 1 && (
            <div className="space-y-8">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-foreground mb-2">Define Your Learning Goals</h3>
                <p className="text-muted-foreground">{goals.length > 0 ? `You've added ${goals.length} goal(s). Add more or proceed.` : "Let's create a custom learning path."}</p>
              </div>
              {/* Error display */}
              {error && (
                <div className="mt-4 p-4 bg-destructive/10 border border-destructive rounded-lg flex items-center gap-3 text-destructive">
                  <AlertCircle className="w-5 h-5" />
                  <p>{error}</p>
                </div>
              )}
              {searchHistory.length > 0 && (
                <div className="bg-card-foreground/5 rounded-2xl p-6 border border-border">
                  <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5 text-accent" /> Quick Add from Recent Topics</h4>
                  <div className="flex flex-wrap gap-2">
                    {searchHistory.slice(0, 8).map((topic, index) => (
                      <button key={index} onClick={() => addTopicToCurrentGoal(topic)} className="px-4 py-2 text-sm bg-background hover:bg-accent/10 text-foreground hover:text-accent rounded-xl transition-all duration-200 border border-border hover:border-accent shadow-sm hover:shadow-md">{topic}</button>
                    ))}
                  </div>
                </div>
              )}
              <div className="bg-muted/20 rounded-2xl p-6 space-y-6 border border-border">
                <h4 className="font-semibold text-foreground flex items-center gap-2"><Plus className="w-5 h-5 text-primary" /> Add Learning Goal</h4>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="goal-title" className="flex justify-between text-sm font-medium mb-1">
                      <span className="text-foreground">Goal Title</span>
                      {validationErrors.title && <span className="text-destructive">Required</span>}
                    </label>
                    <input 
                      type="text" 
                      id="goal-title" 
                      value={currentGoal.title || ''} 
                      onChange={e => {
                        setCurrentGoal({ ...currentGoal, title: e.target.value });
                        if (e.target.value) {
                          setValidationErrors(prev => ({ ...prev, title: false }));
                        }
                      }} 
                      placeholder="e.g., Master React Hooks" 
                      className={`w-full p-3 rounded-lg bg-input border ${validationErrors.title ? 'border-destructive' : 'border-border'} focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder-muted-foreground`} 
                    />
                  </div>
                  <div>
                    <label htmlFor="goal-description" className="block text-sm font-medium text-foreground mb-1">Description</label>
                    <textarea id="goal-description" value={currentGoal.description || ''} onChange={e => setCurrentGoal({ ...currentGoal, description: e.target.value })} placeholder="What specific skills will you gain?" rows={3} className="w-full p-3 rounded-lg bg-input border border-border focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder-muted-foreground"></textarea>
                  </div>
                  <div>
                    <label htmlFor="goal-topics" className="flex justify-between text-sm font-medium mb-1">
                      <span className="text-foreground">Topics</span>
                      {validationErrors.topics && <span className="text-destructive">Add at least one topic</span>}
                    </label>
                    <div className="flex space-x-2">
                      <input 
                        type="text" 
                        id="goal-topics" 
                        placeholder="Add related topics" 
                        className={`flex-1 p-3 rounded-lg bg-input border ${validationErrors.topics ? 'border-destructive' : 'border-border'} focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder-muted-foreground`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.currentTarget.value.trim() !== '') {
                            e.preventDefault();
                            addTopicToCurrentGoal(e.currentTarget.value.trim());
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                      <button 
                        type="button"
                        onClick={(e) => {
                          const input = document.getElementById('goal-topics') as HTMLInputElement;
                          if (input.value.trim() !== '') {
                            addTopicToCurrentGoal(input.value.trim());
                            input.value = '';
                          }
                        }}
                        className="p-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    
                    {/* Display selected topics */}
                    {currentGoal.topics && currentGoal.topics.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {currentGoal.topics.map((topic, index) => (
                          <div key={index} className="flex items-center bg-accent/20 text-accent-foreground px-3 py-1 rounded-full text-sm">
                            {topic}
                            <button 
                              type="button"
                              onClick={() => removeTopicFromCurrentGoal(topic)}
                              className="ml-2 text-accent-foreground/70 hover:text-accent-foreground"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="goal-difficulty" className="block text-sm font-medium text-foreground mb-1">Difficulty</label>
                    <select id="goal-difficulty" value={currentGoal.difficulty || 'beginner'} onChange={e => setCurrentGoal({ ...currentGoal, difficulty: e.target.value as 'beginner' | 'intermediate' | 'advanced' })} className="w-full p-3 rounded-lg bg-input border border-border focus:ring-2 focus:ring-primary focus:border-transparent text-foreground">
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="goal-hours" className="block text-sm font-medium text-foreground mb-1">Estimated Hours</label>
                    <input type="number" id="goal-hours" value={currentGoal.estimatedHours || 10} onChange={e => setCurrentGoal({ ...currentGoal, estimatedHours: parseInt(e.target.value) })} className="w-full p-3 rounded-lg bg-input border border-border focus:ring-2 focus:ring-primary focus:border-transparent text-foreground" />
                  </div>
                  <div>
                    <label htmlFor="goal-priority" className="block text-sm font-medium text-foreground mb-1">Priority</label>
                    <select id="goal-priority" value={currentGoal.priority} onChange={e => setCurrentGoal({ ...currentGoal, priority: e.target.value as 'low' | 'medium' | 'high' })} className="w-full p-3 rounded-lg bg-input border border-border focus:ring-2 focus:ring-primary focus:border-transparent text-foreground">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                <button onClick={addGoal} className="w-full flex items-center justify-center gap-2 p-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors duration-200"><Plus className="w-5 h-5" /> Add Goal</button>
              </div>
              {goals.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground flex items-center gap-2"><BookOpen className="w-5 h-5 text-secondary" /> Your Learning Goals</h4>
                  {goals.map((goal) => (
                    <div key={goal.id} className="bg-muted/20 rounded-2xl p-6 border border-border flex justify-between items-start">
                      <div>
                        <h5 className="font-bold text-lg text-foreground mb-1">{goal.title}</h5>
                        <p className="text-sm text-muted-foreground mb-2">{goal.description}</p>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {goal.estimatedHours} hrs</span>
                          <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {goal.difficulty}</span>
                          <span className="flex items-center gap-1"><ArrowRight className="w-3 h-3" /> {goal.priority}</span>
                          {goal.topics && goal.topics.length > 0 && <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {goal.topics.join(', ')}</span>}
                        </div>
                      </div>
                      <button onClick={() => removeGoal(goal.id)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end mt-8">
                <button onClick={() => setStep(2)} disabled={goals.length === 0} className="flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed">Next: Review Path <ArrowRight className="w-5 h-5" /></button>
              </div>
            </div>
          )}
          {step === 2 && (
            <>
              <div className="text-center">
                <h3 className="text-2xl font-bold text-foreground mb-2">Review Your Learning Path</h3>
                <p className="text-muted-foreground">Confirm your goals before creating your personalized path.</p>
              </div>
              
              {/* Error display */}
              {error && (
                <div className="mt-4 p-4 bg-destructive/10 border border-destructive rounded-lg flex items-center gap-3 text-destructive">
                  <AlertCircle className="w-5 h-5" />
                  <p>{error}</p>
                </div>
              )}
              
              {/* Conversion status */}
              <div className="mt-6 mb-4 p-4 bg-muted rounded-lg border border-border">
                <h4 className="font-semibold flex items-center gap-2 mb-2">
                  <Clipboard className="w-5 h-5 text-primary" />
                  <span>Path Summary</span>
                </h4>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className={`w-5 h-5 ${goals.length > 0 ? 'text-green-500' : 'text-muted-foreground'}`} />
                    <span>{goals.length} learning goals defined</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className={`w-5 h-5 ${conversionStatus ? 'text-green-500' : 'text-muted-foreground'}`} />
                    <span>{conversionStatus ? 'Goals ready for conversion' : 'Goals will be converted to learning steps'}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className={`w-5 h-5 ${generatedSteps && generatedSteps.length > 0 ? 'text-green-500' : 'text-muted-foreground'}`} />
                    <span>
                      {generatedSteps && generatedSteps.length > 0 
                        ? `${generatedSteps.length} learning steps will be created` 
                        : 'Learning steps will be generated'}
                    </span>
                  </li>
                </ul>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-foreground flex items-center gap-2"><BookOpen className="w-5 h-5 text-secondary" /> Your Learning Goals</h4>
                {goals.map((goal) => (
                  <div key={goal.id} className="bg-muted/20 rounded-2xl p-6 border border-border">
                    <h5 className="font-bold text-lg text-foreground mb-1">{goal.title}</h5>
                    <p className="text-sm text-muted-foreground mb-2">{goal.description}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {goal.estimatedHours} hrs</span>
                      <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {goal.difficulty}</span>
                      <span className="flex items-center gap-1"><ArrowRight className="w-3 h-3" /> {goal.priority}</span>
                      {goal.topics && goal.topics.length > 0 && <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {goal.topics.join(', ')}</span>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-8">
                <button onClick={() => setStep(1)} className="flex items-center gap-2 px-6 py-3 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors duration-200">Back</button>
                <button onClick={handleCreatePath} disabled={isCreating} className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors duration-200 disabled:opacity-50">
                  {isCreating ? <><Loader2 className="w-5 h-5 animate-spin" />Creating...</> : <><Brain className="w-5 h-5" />Create Path</>}
                </button>
              </div>
            </>
          )}
          {step === 3 && (
            <div className="space-y-8">
              <div className="text-center py-6">
                <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-16 h-16 text-green-500" />
                </div>
                <h3 className="text-3xl font-bold text-foreground mb-2">Success!</h3>
                <p className="text-muted-foreground mb-2">Your custom learning path has been created.</p>
                <p className="text-sm text-muted-foreground">{generatedSteps?.length || 0} learning steps are ready to explore</p>
              </div>
              
              {/* Path summary */}
              {generatedSteps && generatedSteps.length > 0 && (
                <div className="bg-muted/20 rounded-2xl p-6 border border-border max-h-64 overflow-y-auto">
                  <h4 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                    <BookOpen className="w-5 h-5 text-secondary" /> Learning Path Overview
                  </h4>
                  <ul className="space-y-3">
                    {generatedSteps.map((step, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="bg-accent/20 text-accent rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{step.title}</p>
                          {step.description && (
                            <p className="text-sm text-muted-foreground">{step.description}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="flex justify-center pt-4">
                <button 
                  onClick={handleFinish} 
                  className="px-8 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors duration-200 flex items-center gap-2"
                >
                  <Check className="w-5 h-5" /> Start Learning
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomLearningPathModal;
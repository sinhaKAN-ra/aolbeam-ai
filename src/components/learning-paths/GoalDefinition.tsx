import React, { useState } from 'react';
import { Plus, X, Target, Clock, Hash } from 'lucide-react';
import { CustomLearningGoal, PathType } from '@/types/chat-feature/chat-feature';

interface GoalDefinitionProps {
  goals: CustomLearningGoal[];
  onAddGoal: (goal: CustomLearningGoal) => void;
  onRemoveGoal: (goalId: string) => void;
  pathType: PathType | null;
}

const DIFFICULTY_OPTIONS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' }
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }
];

const GoalDefinition: React.FC<GoalDefinitionProps> = ({
  goals,
  onAddGoal,
  onRemoveGoal,
  pathType
}) => {
  const [newGoal, setNewGoal] = useState<Partial<CustomLearningGoal>>({
    title: '',
    description: '',
    difficulty: 'intermediate',
    priority: 'medium',
    topics: [],
    estimatedHours: 10
  });
  const [topicInput, setTopicInput] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  
  // Validate all fields
  const validateFields = (fields: Partial<CustomLearningGoal> = newGoal) => {
    const errors: Record<string, string> = {};
    
    if (!fields.title?.trim()) {
      errors.title = 'Please enter a title for your goal';
    } else if (fields.title.trim().length < 5) {
      errors.title = 'Title should be at least 5 characters long';
    }
    
    if (!fields.description?.trim()) {
      errors.description = 'Please provide a description of your goal';
    } else if (fields.description.trim().length < 20) {
      errors.description = 'Description should be at least 20 characters long';
    }
    
    if (!fields.topics?.length) {
      errors.topics = 'Please add at least one topic';
    } else if (fields.topics.some(topic => topic.trim().length === 0)) {
      errors.topics = 'Topic cannot be empty';
    }
    
    if (fields.estimatedHours !== undefined && (isNaN(fields.estimatedHours) || fields.estimatedHours < 1)) {
      errors.estimatedHours = 'Please enter a valid number of hours (minimum 1)';
    }
    
    return errors;
  };
  
  // Handle field blur
  const handleBlur = (field: string) => {
    if (!touchedFields[field]) {
      setTouchedFields(prev => ({ ...prev, [field]: true }));
      
      // Validate only the blurred field
      const fieldErrors = validateFields({ [field]: newGoal[field as keyof typeof newGoal] });
      setValidationErrors(prev => ({
        ...prev,
        [field]: fieldErrors[field]
      }));
    }
  };

  // Helper to get form title based on path type
  const getFormTitle = () => {
    switch(pathType) {
      case 'skill':
        return 'What skill do you want to learn?';
      case 'advancement':
        return 'What career advancement are you aiming for?';
      case 'career-change':
        return 'What career change do you want to make?';
      default:
        return 'Define your learning goal';
    }
  };

  // Helper to get placeholder text based on path type
  const getTitlePlaceholder = () => {
    switch(pathType) {
      case 'skill':
        return 'e.g., Learn Python Programming';
      case 'advancement':
        return 'e.g., Junior to Senior Developer';
      case 'career-change':
        return 'e.g., Marketing to UX Design';
      default:
        return 'Enter your goal title';
    }
  };

  // Add a topic to the list
  const handleAddTopic = () => {
    if (topicInput.trim()) {
      const newTopics = [...(newGoal.topics || []), topicInput.trim()];
      setNewGoal(prev => ({
        ...prev,
        topics: newTopics
      }));
      
      // Clear any topics error when adding a new topic
      if (validationErrors.topics) {
        const newErrors = { ...validationErrors };
        delete newErrors.topics;
        setValidationErrors(newErrors);
      }
      
      setTopicInput('');
      
      // Mark topics as touched
      if (!touchedFields.topics) {
        setTouchedFields(prev => ({ ...prev, topics: true }));
      }
    }
  };

  // Remove a topic from the list
  const handleRemoveTopic = (indexToRemove: number) => {
    const newTopics = (newGoal.topics || []).filter((_, index) => index !== indexToRemove);
    setNewGoal(prev => ({
      ...prev,
      topics: newTopics
    }));
    
    // Update validation if no topics remain
    if (newTopics.length === 0) {
      setValidationErrors(prev => ({
        ...prev,
        topics: 'Please add at least one topic'
      }));
    }
    
    // Mark topics as touched
    if (!touchedFields.topics) {
      setTouchedFields(prev => ({ ...prev, topics: true }));
    }
  };

  const handleSubmit = () => {
    // Mark all fields as touched
    const allFieldsTouched = Object.keys(newGoal).reduce((acc, key) => ({
      ...acc,
      [key]: true
    }), {});
    
    setTouchedFields(allFieldsTouched);
    
    // Validate all fields
    const errors = validateFields();
    setValidationErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      // Scroll to first error
      const firstError = Object.keys(errors)[0];
      const element = document.querySelector(`[data-field="${firstError}"]`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Create a complete goal with all required fields
    const completeGoal: CustomLearningGoal = {
      id: Date.now().toString(),
      title: newGoal.title!.trim(),
      description: newGoal.description!.trim(),
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default to 30 days from now
      topics: newGoal.topics || [],
      difficulty: newGoal.difficulty || 'intermediate',
      priority: newGoal.priority || 'medium',
      estimatedHours: newGoal.estimatedHours || 10
    };

    // Add the goal
    onAddGoal(completeGoal);

    // Reset form for next goal
    setNewGoal({
      title: '',
      description: '',
      difficulty: 'intermediate',
      priority: 'medium',
      topics: [],
      estimatedHours: 10
    });
    
    // Reset touched fields
    setTouchedFields({});
    setValidationErrors({});
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">{getFormTitle()}</h2>
        <p className="text-muted-foreground">
          {goals.length > 0 
            ? 'You can add more goals or proceed to the next step'
            : 'Define what you want to learn or achieve'}
        </p>
      </div>

      {/* Goal Form */}
      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-1">Goal Title <span className="text-red-500">*</span></label>
          <input
            type="text"
            id="title"
            value={newGoal.title}
            onChange={(e) => {
              setNewGoal({ ...newGoal, title: e.target.value });
              // Clear error when user starts typing
              if (validationErrors.title) {
                const newErrors = { ...validationErrors };
                delete newErrors.title;
                setValidationErrors(newErrors);
              }
            }}
            onBlur={() => handleBlur('title')}
            className={`w-full px-3 py-2 border ${
              touchedFields.title && validationErrors.title 
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
            } rounded-md shadow-sm`}
            placeholder="Enter goal title"
            aria-invalid={!!validationErrors.title}
            aria-describedby={validationErrors.title ? 'title-error' : undefined}
          />
        </div>

        {/* Description */}
        <div className="space-y-2" data-field="description">
          <div className="flex justify-between">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description <span className="text-red-500">*</span>
            </label>
            {touchedFields.description && validationErrors.description && (
              <span className="text-sm text-red-600">{validationErrors.description}</span>
            )}
          </div>
          <textarea
            id="description"
            value={newGoal.description}
            onChange={(e) => {
              setNewGoal({ ...newGoal, description: e.target.value });
              // Clear error when user starts typing
              if (validationErrors.description) {
                const newErrors = { ...validationErrors };
                delete newErrors.description;
                setValidationErrors(newErrors);
              }
            }}
            onBlur={() => handleBlur('description')}
            className={`w-full p-3 rounded-md border ${
              touchedFields.description && validationErrors.description 
                ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                : 'border-border focus:ring-indigo-500 focus:border-indigo-500'
            } bg-background min-h-[100px] shadow-sm`}
            placeholder="Describe what you want to achieve with this goal"
            aria-invalid={!!validationErrors.description}
            aria-describedby={validationErrors.description ? 'description-error' : undefined}
          />
        </div>
        
        {/* Topics */}
        <div className="space-y-2" data-field="topics">
          <div className="flex justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Topics <span className="text-red-500">*</span>
            </label>
            {touchedFields.topics && validationErrors.topics && (
              <span className="text-sm text-red-600">{validationErrors.topics}</span>
            )}
          </div>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={topicInput}
              onChange={(e) => {
                setTopicInput(e.target.value);
                // Clear topics error when user starts typing
                if (validationErrors.topics) {
                  const newErrors = { ...validationErrors };
                  delete newErrors.topics;
                  setValidationErrors(newErrors);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTopic();
                }
              }}
              onBlur={() => handleBlur('topics')}
              className={`flex-1 p-2 rounded-md border ${
                touchedFields.topics && validationErrors.topics
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : 'border-border focus:ring-indigo-500 focus:border-indigo-500'
              } shadow-sm`}
              placeholder="Add a topic and press Enter"
              aria-invalid={!!validationErrors.topics}
              aria-describedby={validationErrors.topics ? 'topics-error' : undefined}
            />
            <button
              type="button"
              onClick={handleAddTopic}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Add
            </button>
          </div>
          
          {/* Topic Tags */}
          <div className="flex flex-wrap gap-2 min-h-[40px] mt-2">
            {newGoal.topics?.map((topic: string, index: number) => (
              <div key={index} className="flex items-center bg-gray-100 px-3 py-1 rounded-full text-sm">
                {topic}
                <button
                  type="button"
                  onClick={() => {
                    handleRemoveTopic(index);
                    // Update touched state when topics change
                    if (!touchedFields.topics) {
                      setTouchedFields(prev => ({ ...prev, topics: true }));
                    }
                  }}
                  className="ml-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  aria-label={`Remove topic ${topic}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
        
        {/* Difficulty */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Difficulty
          </label>
          <div className="flex border border-border rounded-md overflow-hidden">
            {DIFFICULTY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setNewGoal(prev => ({ ...prev, difficulty: option.value as any }))}
                className={`flex-1 py-2 px-3 text-center text-sm transition-colors ${
                  newGoal.difficulty === option.value 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-background hover:bg-muted/50'
                }`}
                aria-pressed={newGoal.difficulty === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Priority */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Priority
          </label>
          <div className="flex border border-border rounded-md overflow-hidden">
            {PRIORITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setNewGoal(prev => ({ ...prev, priority: option.value as any }))}
                className={`flex-1 py-2 px-3 text-center text-sm transition-colors ${
                  newGoal.priority === option.value 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-background hover:bg-muted/50'
                }`}
                aria-pressed={newGoal.priority === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Estimated Hours */}
        <div className="space-y-2" data-field="estimatedHours">
          <div className="flex justify-between">
            <label htmlFor="estimatedHours" className="block text-sm font-medium text-gray-700">
              Estimated Hours <span className="text-red-500">*</span>
            </label>
            {touchedFields.estimatedHours && validationErrors.estimatedHours && (
              <span className="text-sm text-red-600">{validationErrors.estimatedHours}</span>
            )}
          </div>
          <div className="relative">
            <input
              id="estimatedHours"
              type="number"
              min="1"
              max="1000"
              value={newGoal.estimatedHours || ''}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                setNewGoal(prev => ({
                  ...prev,
                  estimatedHours: isNaN(value) ? undefined : value
                }));
                
                // Clear error when user starts typing
                if (validationErrors.estimatedHours) {
                  const newErrors = { ...validationErrors };
                  delete newErrors.estimatedHours;
                  setValidationErrors(newErrors);
                }
              }}
              onBlur={() => handleBlur('estimatedHours')}
              className="w-full pl-3 pr-10 py-2 border border-border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter estimated hours"
              aria-invalid={!!validationErrors.estimatedHours}
              aria-describedby={validationErrors.estimatedHours ? 'estimatedHours-error' : undefined}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Clock className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>
        
        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full bg-primary hover:bg-primary/90 text-white py-2 px-4 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={Object.keys(validationErrors).length > 0}
          >
            {goals.length > 0 ? 'Add Another Goal' : 'Add Goal'}
          </button>
        </div>
      </div>

      {/* Added Goals */}
      {goals.length > 0 && (
        <div className="border border-border rounded-xl p-4 mt-8">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <Target className="w-5 h-5" /> Your Goals
          </h3>
          <div className="space-y-4">
            {goals.map((goal: CustomLearningGoal) => (
              <div key={goal.id} className="border border-border rounded-lg p-4 bg-muted/20">
                <div className="flex justify-between items-start">
                  <h4 className="font-medium">{goal.title}</h4>
                  <button
                    onClick={() => onRemoveGoal(goal.id)}
                    className="text-muted-foreground hover:text-primary"
                    aria-label={`Remove goal: ${goal.title}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
                
                {/* Topics */}
                {goal.topics && goal.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {goal.topics.map((topic: string, index: number) => (
                      <span key={index} className="text-xs bg-muted px-2 py-0.5 rounded-full">
                        {topic}
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Meta info */}
                <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Hash className="w-3 h-3" />
                    {goal.difficulty}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {goal.estimatedHours} hours
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalDefinition;

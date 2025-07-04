import React, { useState } from 'react';
import { X, Edit2, GripVertical, ListChecks, Check, Target } from 'lucide-react';
import { CustomLearningGoal, LearningStep } from '@/types/chat-feature/chat-feature';

interface PathReviewProps {
  goals: CustomLearningGoal[];
  generatedSteps: LearningStep[];
  onEditStep: (stepId: string, updatedStep: Partial<LearningStep>) => void;
  onReorderSteps: (reorderedSteps: LearningStep[]) => void;
}

const PathReview: React.FC<PathReviewProps> = ({
  goals,
  generatedSteps,
  onEditStep,
  onReorderSteps,
}) => {
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<LearningStep>>({});

  const handleEditClick = (step: LearningStep) => {
    setEditingStepId(step.id);
    setEditFormData({
      title: step.title,
      description: step.description,
      estimatedTime: step.estimatedTime,
      resources: step.resources,
      category: step.category,
    });
  };

  const handleCancelEdit = () => {
    setEditingStepId(null);
    setEditFormData({});
  };

  const handleSaveEdit = (stepId: string) => {
    onEditStep(stepId, editFormData);
    setEditingStepId(null);
    setEditFormData({});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Review Your Learning Path</h2>
        <p className="text-muted-foreground">Review and customize the learning steps before finalizing</p>
      </div>

      {/* Goals Section */}
      <div className="border border-border rounded-xl p-4">
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <Target className="w-5 h-5" /> Your Learning Goals
        </h3>
        <div className="space-y-4">
          {goals.map((goal) => (
            <div key={goal.id} className="border border-border rounded-lg p-4 bg-muted/20">
              <h4 className="font-medium">{goal.title}</h4>
              <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
              
              {/* Topics */}
              {goal.topics.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {goal.topics.map((topic, index) => (
                    <span key={index} className="text-xs bg-muted px-2 py-0.5 rounded-full">
                      {topic}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Generated Steps Section */}
      <div className="border border-border rounded-xl p-4">
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <ListChecks className="w-5 h-5" /> Learning Steps
        </h3>

        {generatedSteps.length > 0 ? (
          <div className="space-y-4">
            {generatedSteps.map((step, index) => (
              <div 
                key={step.id} 
                className={`border rounded-lg ${editingStepId === step.id ? 'border-primary' : 'border-border'} bg-muted/10`}
              >
                {editingStepId === step.id ? (
                  // Edit Form
                  <div className="p-4">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Step Title</label>
                        <input
                          type="text"
                          name="title"
                          value={editFormData.title || ''}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-border rounded-md bg-background"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <textarea
                          name="description"
                          value={editFormData.description || ''}
                          onChange={handleInputChange}
                          rows={3}
                          className="w-full p-2 border border-border rounded-md bg-background"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Estimated Time</label>
                          <input
                            type="text"
                            name="estimatedTime"
                            value={editFormData.estimatedTime || ''}
                            onChange={handleInputChange}
                            placeholder="e.g. 2 hours"
                            className="w-full p-2 border border-border rounded-md bg-background"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">Category</label>
                          <input
                            type="text"
                            name="category"
                            value={editFormData.category || ''}
                            onChange={handleInputChange}
                            placeholder="e.g. Reading, Practice"
                            className="w-full p-2 border border-border rounded-md bg-background"
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-2 mt-4">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-3 py-1 border border-border rounded-md hover:bg-muted"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(step.id)}
                          className="px-3 py-1 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-1"
                        >
                          <Check className="w-4 h-4" /> Save
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Display Step
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-muted w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <h4 className="font-medium">{step.title}</h4>
                      </div>
                      
                      <button
                        onClick={() => handleEditClick(step)}
                        className="text-muted-foreground hover:text-primary p-1 rounded-md hover:bg-muted/50"
                        title="Edit step"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="mt-2 ml-11">
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                      
                      <div className="flex items-center gap-4 mt-2 text-xs">
                        <span className="text-muted-foreground">{step.estimatedTime}</span>
                        {step.category && (
                          <span className="bg-muted/50 px-2 py-0.5 rounded-full">{step.category}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-8 border border-dashed border-border rounded-lg">
            <p className="text-muted-foreground">No learning steps have been generated yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PathReview;

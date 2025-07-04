import React, { useState } from 'react';
import { Clock, CheckCircle2, Edit, BookOpen, MessageSquare, Target } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { LearningPath, PathType } from '@/types/chat-feature/chat-feature';

interface PathDetailViewProps {
  path: LearningPath;
  onEdit: () => void;
  onUpdateProgress: (stepId: string) => void;
}

const PathDetailView: React.FC<PathDetailViewProps> = ({
  path,
  onEdit,
  onUpdateProgress,
}) => {
  const [showCompleted, setShowCompleted] = useState(true);
  
  // Calculate progress percentage
  const completedSteps = path.steps.filter(step => step.completed).length;
  const progressPercentage = path.steps.length > 0 
    ? Math.round((completedSteps / path.steps.length) * 100)
    : 0;
    
  // Format date for readability
  const getFormattedDate = (dateStr?: string | Date) => {
    if (!dateStr) return '';
    try {
      const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      return '';
    }
  };
  
  // Get the appropriate path type display
  const getPathTypeDisplay = (type?: PathType) => {
    switch(type) {
      case 'skill':
        return { label: 'Skill Path', icon: <BookOpen className="w-5 h-5" /> };
      case 'advancement':
        return { label: 'Career Advancement', icon: <Target className="w-5 h-5" /> };
      case 'career-change':
        return { label: 'Career Change', icon: <MessageSquare className="w-5 h-5" /> };
      default:
        return { label: 'Learning Path', icon: <BookOpen className="w-5 h-5" /> };
    }
  };
  
  // Filter steps based on completion status
  const filteredSteps = showCompleted 
    ? path.steps 
    : path.steps.filter(step => !step.completed);
  
  const pathTypeDisplay = getPathTypeDisplay(path.path_type);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-full bg-primary/10 text-primary">
              {pathTypeDisplay.icon}
            </div>
            <span className="text-sm font-medium">{pathTypeDisplay.label}</span>
          </div>
          <h1 className="text-2xl font-bold">{path.title}</h1>
          <p className="text-muted-foreground mt-1">{path.description}</p>
        </div>
        
        <button
          onClick={onEdit}
          className="px-3 py-1 bg-muted rounded-md hover:bg-muted/80 flex items-center gap-1"
        >
          <Edit className="w-4 h-4" /> Edit
        </button>
      </div>
      
      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span>Progress</span>
          <span className="font-medium">{progressPercentage}%</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary" 
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
      
      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 border border-border rounded-xl bg-muted/10">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-medium">Last Updated</h3>
          </div>
          <p className="text-muted-foreground mt-2">{getFormattedDate(path.updated_at)}</p>
        </div>
        
        <div className="p-4 border border-border rounded-xl bg-muted/10">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-medium">Main Topic</h3>
          </div>
          <p className="text-muted-foreground mt-2">{path.main_topic || path.topic}</p>
        </div>
        
        <div className="p-4 border border-border rounded-xl bg-muted/10">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-medium">Steps</h3>
          </div>
          <p className="text-muted-foreground mt-2">{completedSteps} of {path.steps.length} completed</p>
        </div>
      </div>
      
      {/* Learning Steps */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Learning Steps</h2>
          <div className="flex items-center">
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={() => setShowCompleted(!showCompleted)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              Show Completed
            </label>
          </div>
        </div>
        
        {filteredSteps.length > 0 ? (
          <ol className="space-y-3">
            {filteredSteps.map((step) => (
              <li
                key={step.id}
                className={`border ${step.completed ? 'border-muted bg-muted/20' : 'border-border bg-background'} rounded-xl p-4`}
              >
                <div className="flex gap-4">
                  <button
                    onClick={() => onUpdateProgress(step.id)}
                    className={`rounded-full w-6 h-6 flex-shrink-0 mt-1 ${step.completed ? 'bg-primary text-primary-foreground' : 'border border-muted-foreground'}`}
                  >
                    {step.completed && <CheckCircle2 className="w-4 h-4 m-auto" />}
                  </button>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className={`font-medium ${step.completed ? 'text-muted-foreground' : ''}`}>
                          {step.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                        
                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                          <span>{step.estimatedTime || '30 min'}</span>
                          {step.category && <span>{step.category}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {!step.completed && (
                  <div className="mt-3 ml-10 flex gap-2">
                    <Link
                      href={`/tests/new?topic=${encodeURIComponent(step.title)}`}
                      className="text-sm bg-secondary text-secondary-foreground px-3 py-1 rounded-md hover:bg-secondary/90"
                    >
                      Practice
                    </Link>
                    <Link
                      href={`/chat/new?topic=${encodeURIComponent(step.title)}`}
                      className="text-sm bg-primary text-primary-foreground px-3 py-1 rounded-md hover:bg-primary/90 flex items-center gap-1"
                    >
                      <MessageSquare className="w-3 h-3" /> Learn
                    </Link>
                  </div>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <div className="text-center py-8 border border-dashed border-border rounded-xl">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {showCompleted ? 'No steps available for this learning path.' : 'All steps are completed!'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PathDetailView;

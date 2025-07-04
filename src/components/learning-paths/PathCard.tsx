import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Code, TrendingUp, Shuffle, Clock } from 'lucide-react';
import { LearningPath, PathType } from '@/types/chat-feature/chat-feature';

interface PathCardProps {
  path: LearningPath;
  isSelected: boolean;
  onClick: () => void;
  progress?: number;
  onDelete?: () => void;
}

const PathCard: React.FC<PathCardProps> = ({
  path,
  isSelected,
  onClick,
  progress = 0,
  onDelete,
}) => {
  // Helper to get the appropriate icon based on path type
  const getPathIcon = (type?: PathType) => {
    switch(type) {
      case 'skill':
        return <Code className="w-5 h-5" />;
      case 'advancement':
        return <TrendingUp className="w-5 h-5" />;
      case 'career-change':
        return <Shuffle className="w-5 h-5" />;
      default:
        return <Code className="w-5 h-5" />; // Default to skill icon
    }
  };
  
  // Helper to get label text based on path type
  const getPathLabel = (type?: PathType) => {
    switch(type) {
      case 'skill':
        return 'Skill';
      case 'advancement':
        return 'Career Advancement';
      case 'career-change':
        return 'Career Change';
      default:
        return 'Learning Path';
    }
  };
  
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

  return (
    <div
      className={`p-5 border rounded-xl mb-3 relative group transition-all duration-200 ${isSelected ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-muted/30'}`}
    >
      {/* Delete button */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded text-destructive"
          aria-label="Delete path"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </button>
      )}
      <div onClick={onClick} className="cursor-pointer">
      {/* Path Type Label */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-full ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
            {getPathIcon(path.path_type)}
          </div>
          <span className="text-xs bg-muted px-2 py-1 rounded-full">{getPathLabel(path.path_type)}</span>
        </div>
        
        {/* Last Updated */}
        <div className="flex items-center text-xs text-muted-foreground">
          <Clock className="w-3 h-3 mr-1" />
          {getFormattedDate(path.updated_at)}
        </div>
      </div>
      
      {/* Path Title */}
      <h3 className="text-lg font-medium mb-1 line-clamp-1">{path.title}</h3>
      
      {/* Path Description */}
      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{path.description || `A learning path about ${path.topic || path.main_topic}`}</p>
      
      {/* Progress Bar */}
      <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
        <div 
          className="bg-primary h-full" 
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Stats */}
      <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
        <span>{Math.round(progress)}% Complete</span>
        <span>{path.steps.length} Steps</span>
      </div>
    </div>
    </div>
  );
  
};

export default PathCard;

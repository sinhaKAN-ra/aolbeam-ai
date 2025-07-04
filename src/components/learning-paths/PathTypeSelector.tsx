import React from 'react';
import { Code, TrendingUp, Shuffle } from 'lucide-react';
import { PathType } from '@/types/chat-feature/chat-feature';

interface PathTypeSelectorProps {
  selectedType: PathType | null;
  onChange: (type: PathType) => void;
}

const PathTypeSelector: React.FC<PathTypeSelectorProps> = ({
  selectedType,
  onChange,
}) => {
  const pathTypes = [
    {
      id: 'skill',
      title: 'Learn a Skill',
      description: 'Master a specific technology, language, or concept',
      icon: <Code className="w-6 h-6" />,
      examples: ['JavaScript', 'UX Design', 'Public Speaking']
    },
    {
      id: 'advancement',
      title: 'Advance Your Career',
      description: 'Level up in your current career path',
      icon: <TrendingUp className="w-6 h-6" />,
      examples: ['Junior to Mid-level Developer', 'Manager to Director', 'Teacher to Principal']
    },
    {
      id: 'career-change',
      title: 'Change Careers',
      description: 'Transition to a new career field',
      icon: <Shuffle className="w-6 h-6" />,
      examples: ['Marketing to UX Design', 'Finance to Data Science', 'Teaching to Software Engineering']
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">What type of learning path do you want to create?</h2>
        <p className="text-muted-foreground">Choose the option that best fits your learning goals</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {pathTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => onChange(type.id as PathType)}
            className={`flex items-start p-6 rounded-xl border ${selectedType === type.id ? 'border-primary bg-primary/5' : 'border-border bg-background'} hover:bg-muted/30 transition-all duration-200 w-full text-left`}
          >
            <div className="mr-5">
              <div className={`p-3 rounded-full ${selectedType === type.id ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
                {type.icon}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1">{type.title}</h3>
              <p className="text-muted-foreground mb-3">{type.description}</p>
              <div className="flex flex-wrap gap-2">
                {type.examples.map((example, i) => (
                  <span key={i} className="text-xs bg-muted px-2 py-1 rounded-full">{example}</span>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PathTypeSelector;

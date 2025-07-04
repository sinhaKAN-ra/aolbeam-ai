import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PathCreationCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

const PathCreationCard: React.FC<PathCreationCardProps> = ({
  icon,
  title,
  description,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className="bg-background hover:bg-muted/30 border border-border p-6 rounded-xl transition-all duration-200 hover:shadow-md text-left flex flex-col gap-4 h-full"
    >
      <div className="bg-primary/10 text-primary p-3 rounded-full w-fit">
        {icon}
      </div>
      <div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </button>
  );
};

export default PathCreationCard;

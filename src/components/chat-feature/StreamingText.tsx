import React, { useState, useEffect } from 'react';
import Markdown from '@/components/Markdown';

interface StreamingTextProps {
  text: string;
  isComplete?: boolean;
  speed?: number;
}

const StreamingText: React.FC<StreamingTextProps> = ({ text, isComplete = false, speed = 5 }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (isComplete) {
      setDisplayedText(text);
      return;
    }

    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, text, isComplete, speed]);

  return (
    <div className="prose prose-gray max-w-none">
      <div className="whitespace-pre-wrap">
        <Markdown content={displayedText} />
        {!isComplete && currentIndex < text.length && (
          <span className="inline-block w-2 h-5 bg-gray-400 ml-1 animate-pulse" />
        )}
      </div>
    </div>
  );
};

export default StreamingText;

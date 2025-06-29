import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p className="mb-4">{children}</p>,
            a: ({ href, children }) => <a href={href} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
            code: ({ className, children }) => {
              // Check if this is an inline code block based on the parent element
              const isInline = !className || !className.includes('language-');
              return isInline ? 
                <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">{children}</code> : 
                <pre className="block bg-gray-100 p-2 rounded-md my-2 text-sm overflow-x-auto"><code>{children}</code></pre>;
            }
          }}
        >
          {displayedText}
        </ReactMarkdown>
        {!isComplete && currentIndex < text.length && (
          <span className="inline-block w-2 h-5 bg-gray-400 ml-1 animate-pulse" />
        )}
      </div>
    </div>
  );
};

export default StreamingText;

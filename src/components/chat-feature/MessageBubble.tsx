import React from 'react';
import { Message } from '../../types/chat-feature/index';
import { User, Bot, Lightbulb, MessageSquare } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  onRetry?: () => void; // Make onRetry optional
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isCurrentUser, onRetry }) => {
  const isUser = message.sender === 'user';
  const bubbleClass = isUser
    ? 'bg-gradient-to-br from-primary to-secondary text-white rounded-bl-3xl rounded-tr-3xl rounded-tl-xl'
    : 'bg-white text-gray-800 rounded-br-3xl rounded-tl-3xl rounded-tr-xl border border-gray-200 shadow-sm';
  const containerClass = isUser ? 'justify-end' : 'justify-start';
  const iconClass = isUser ? 'bg-primary-200 text-primary-700' : 'bg-gray-200 text-gray-600';

  // Debug log for practice problems
  console.log('message detail', message);
  
  if (message.type === 'practice_problems_list') {
    console.log('Practice problems message:', message);
    console.log('Problems array:', message.problems);
    console.log('Is array:', Array.isArray(message.problems));
    console.log('Array length:', message.problems?.length);
  }

  return (
    <div className={`flex ${containerClass} mb-4`}>
      <div className={`flex items-start gap-3 max-w-[70%]`}>
        {/* {!isUser && (
          <div className={`flex-shrink-0 p-2 rounded-full ${iconClass}`}>
            <Bot className="w-5 h-5" />
          </div>
        )} */}
        <div className={`p-4 text-lg leading-relaxed shadow-md ${bubbleClass}`}>
          {/* Helper function to render basic markdown (bold, newlines) */}
          {(() => {
            const renderMarkdown = (markdownText: string) => {
              let html = markdownText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Bold
              html = html.replace(/\n/g, '<br />'); // Newlines
              return <div dangerouslySetInnerHTML={{ __html: html }} />;
            };
            return renderMarkdown(message.text);
          })()}
          
          
          {message.type === 'practice_problems_list' && (
  <div className="mt-4 space-y-3">
    <h4 className="text-sm font-semibold text-white/90 uppercase tracking-wider mb-2 flex items-center gap-2">
      <Lightbulb className="w-4 h-4 text-yellow-400" />
      Practice Problems
    </h4>
    {message.problems && message.problems.length > 0 ? (
      <div className="grid gap-2">
        {message.problems.map((problem, index) => {
          if (!problem) return null;
          const problemText = typeof problem === 'string' ? problem : JSON.stringify(problem);
          const problemNumber = index + 1;
          
          return (
            <div
              key={index}
              onClick={() => {
                console.log('Problem selected:', problemText);
                // You can add state management here to track selected problem
              }}
              className={`
                group relative p-3 pr-10 rounded-lg border border-white/10
                bg-white/5 hover:bg-white/10 cursor-pointer
                transition-all duration-200 ease-in-out
                hover:shadow-lg hover:shadow-primary/10
                hover:border-white/20
                hover:translate-x-1
              `}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 mt-0.5 rounded-full bg-primary/20 text-primary-foreground text-xs font-medium">
                  {problemNumber}
                </div>
                <div className="text-sm text-black leading-relaxed">
                  {problemText}
                </div>
              </div>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg
                  className="w-4 h-4 text-black/60 group-hover:text-black/90"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      <div className="text-center py-4 px-3 bg-white/5 rounded-lg">
        <p className="text-sm text-gray-400">No practice problems available at the moment.</p>
      </div>
    )}
    <div className="text-xs text-gray-400 mt-2 text-center">
      Select a problem to get started
    </div>
  </div>
)}
          {message.type === 'career_advice' && message.advice && (
            <div className="mt-3 p-3 bg-white/20 rounded-lg text-sm flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-white/80" />
              <span className="font-medium">Advice:</span> {message.advice}
            </div>
          )}
        </div>
        {isUser && (
          <div className={`flex-shrink-0 p-2 rounded-full ${iconClass}`}>
            <User className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
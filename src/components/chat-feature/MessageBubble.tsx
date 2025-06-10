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

  return (
    <div className={`flex ${containerClass} mb-4`}>
      <div className={`flex items-start gap-3 max-w-[70%]`}>
        {!isUser && (
          <div className={`flex-shrink-0 p-2 rounded-full ${iconClass}`}>
            <Bot className="w-5 h-5" />
          </div>
        )}
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
          {message.type === 'practice_problem' && message.problem && (
            <div className="mt-3 p-3 bg-white/20 rounded-lg text-sm">
              <h4 className="font-bold text-white/90 mb-1">Practice Problem:</h4>
              <p>{message.problem.question}</p>
              {message.problem.options && (
                <ul className="list-disc list-inside mt-2">
                  {message.problem.options.map((option, index) => (
                    <li key={index}>{option}</li>
                  ))}
                </ul>
              )}
              {message.problem.answer && (
                <p className="mt-2 text-white/70">Answer: {message.problem.answer}</p>
              )}
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
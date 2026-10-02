import React from 'react';
import { Message } from '../../types/chat-feature/index';
import { Bot, Lightbulb } from 'lucide-react';
import MathRenderer from '@/components/MathRenderer';

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  onRetry?: () => void; // Make onRetry optional
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isCurrentUser, onRetry }) => {
  const isUser = message.sender === 'user';
  
  // Debug log for practice problems if needed
  if (message.type === 'practice_problems_list') {
    console.log('Practice problems message:', message);
    console.log('Problems array:', message.problems);
    console.log('Is array:', Array.isArray(message.problems));
    console.log('Array length:', message.problems?.length);
  }

  return (
    <div key={message.id} className="space-y-4">
      {isUser ? (
        <div className="flex justify-end">
          <div className="max-w-3xl">
            <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-3 shadow-sm">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
            </div>
            <div className="text-xs text-muted-foreground mt-1 text-right">
              {message.timestamp && new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}            
            </div>
          </div>
        </div>
      ) : (
        <div className="flex gap-4">
          <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 max-w-3xl">
            <div className="bg-card rounded-2xl rounded-tl-md p-4 shadow-sm border border-border">
              <div className="text-foreground leading-relaxed prose dark:prose-invert max-w-none">
                <MathRenderer content={message.text} />
                {message.isTyping && (
                  <span className="inline-block w-2 h-5 bg-muted-foreground/60 ml-1 align-middle animate-pulse" />
                )}
              </div>
              {message.type === 'practice_problems_list' && (
              <div className="mt-4 space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
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
                          className="group flex items-center justify-between p-3 bg-card border border-border rounded-lg hover:border-yellow-300 hover:shadow-md transition-all duration-200 text-left cursor-pointer"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 mt-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
                              {problemNumber}
                            </div>
                            <div className="text-sm text-foreground leading-relaxed">
                              {problemText}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 px-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">No practice problems available at the moment.</p>
                  </div>
                )}
              </div>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {message.timestamp && new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}            
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
import React from 'react';
import { Message } from '../../types/chat-feature/index';
import { User, Bot, Lightbulb, MessageSquare } from 'lucide-react';
import StreamingText from './StreamingText';

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
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl rounded-tr-md px-4 py-3 shadow-sm">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
            </div>
            <div className="text-xs text-gray-500 mt-1 text-right">
              {message.timestamp && new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}            
            </div>
          </div>
        </div>
      ) : (
        <div className="flex gap-4">
          <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
            <Bot className="w-4 h-4 text-gray-600" />
          </div>
          <div className="flex-1 max-w-3xl">
            <div className="bg-white rounded-2xl rounded-tl-md p-4 shadow-sm border border-gray-100">
              <div className="text-gray-800 leading-relaxed">
                <StreamingText text={message.text} isComplete={!message.isStreaming} />
              </div>
              {message.type === 'practice_problems_list' && (
              <div className="mt-4 space-y-3">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
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
                          onClick={() => {
                            console.log('Problem selected:', problemText);
                            // You can add state management here to track selected problem
                          }}
                          className="group flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-yellow-300 hover:shadow-md transition-all duration-200 text-left cursor-pointer"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 mt-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
                              {problemNumber}
                            </div>
                            <div className="text-sm text-gray-800 leading-relaxed">
                              {problemText}
                            </div>
                          </div>
                          <div className="text-gray-400 group-hover:text-yellow-500 transition-colors">
                            <svg
                              className="w-4 h-4"
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
                  <div className="text-center py-4 px-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-400">No practice problems available at the moment.</p>
                  </div>
                )}
                <div className="text-xs text-gray-400 mt-2 text-center">
                  Select a problem to get started
                </div>
              </div>
              )}
              {message.type === 'career_advice' && message.advice && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  <span className="font-medium">Advice:</span> {message.advice}
                </div>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {message.timestamp && new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}            
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
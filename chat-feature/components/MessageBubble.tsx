import React from 'react';
import { User, Bot, Sparkles } from 'lucide-react';
import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
        isUser 
          ? 'bg-gradient-to-r from-primary-600 to-secondary-600' 
          : 'bg-gradient-to-r from-green-500 to-emerald-600'
      }`}>
        {isUser ? (
          <User className="w-6 h-6 text-white" />
        ) : (
          <Bot className="w-6 h-6 text-white" />
        )}
      </div>
      
      <div className={`max-w-[75%] ${isUser ? 'text-right' : 'text-left'}`}>
        <div className={`inline-block px-6 py-4 rounded-3xl shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl ${
          isUser 
            ? 'bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-tr-lg' 
            : 'bg-white/90 text-gray-800 rounded-tl-lg border border-orange-200/50'
        }`}>
          <div className="whitespace-pre-wrap leading-relaxed">
            {message.content}
          </div>
          
          {!isUser && (
            <div className="flex items-center gap-1 mt-2 text-xs opacity-70">
              <Sparkles className="w-3 h-3" />
              <span>AI Assistant</span>
            </div>
          )}
        </div>
        
        <div className={`text-xs text-gray-400 mt-2 ${
          isUser ? 'text-right' : 'text-left'
        }`}>
          {message.timestamp.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
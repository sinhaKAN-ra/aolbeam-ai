"use client";

import React, { useRef, useEffect, useState } from 'react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { toast } from 'sonner';
import type { Message, LearningPath, TopicTag, TopicSuggestion, EnhancedMessage } from '../../types/chat-feature';
import MessageBubble from './MessageBubble';
import { Send, Loader2, Sparkles, Brain, Zap, BookOpen, Target } from 'lucide-react';
import { guestChatRemaining } from '@/lib/guestTrial';

interface ChatInterfaceProps {
  isNewSession: boolean;
  onSendMessage: (message: string) => void;
  messages: (Message | EnhancedMessage)[];
  isLoading: boolean;
  learningPath: LearningPath | null;
  searchHistory: string[];
  error?: string | null;
  onRetry?: () => void;
  onNewChat: () => void;
  topicSuggestions: TopicSuggestion[];
  topicTags: TopicTag[];
  selectedTags: string[];
  onTopicTagClick: (tag: TopicTag) => void;
  onCustomPathCreated: (pathId: string) => void;
  onExpandMessage?: (messageId: string, topic: string) => void;
  expandingIds?: string[];
}

const STARTER_TOPICS = [
  { title: 'Machine Learning', description: 'AI algorithms, neural networks & fundamentals', icon: Brain },
  { title: 'Quantum Physics', description: 'Quantum mechanics, superposition & computing', icon: Zap },
  { title: 'Web Development', description: 'Modern web technologies & best practices', icon: BookOpen },
  { title: 'Data Science', description: 'Data analysis, visualization & statistics', icon: Target },
];

export const ChatInterface = ({
  onSendMessage,
  messages,
  isLoading,
  isNewSession,
  error,
  onRetry,
  onExpandMessage,
  expandingIds = [],
}: ChatInterfaceProps) => {
  const [input, setInput] = useState('');
  const [isProcessingMessage, setIsProcessingMessage] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { canUseFeature, isLoading: isFeatureCheckLoading, refetchUsage } = useFeatureAccess();

  // Auto-scroll to the bottom whenever messages change (new turn or streamed token).
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessingMessage) return;

    const text = input.trim();
    try {
      setIsProcessingMessage(true);
      // Limit enforcement + usage recording happen server-side in
      // /api/chat/stream (single source of truth).
      onSendMessage(text);
      setInput('');
      refetchUsage().catch(() => {});
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsProcessingMessage(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const usageLabel = (() => {
    const { remaining, limit } = canUseFeature('chat');
    if (typeof remaining === 'number' && typeof limit === 'number') {
      return `${remaining} of ${limit} messages remaining today`;
    }
    const guestLeft = guestChatRemaining();
    return `${guestLeft} free message${guestLeft === 1 ? '' : 's'} left · sign in for more`;
  })();

  const showWelcome = isNewSession && messages.length === 0;

  return (
    // SINGLE scroll owner: this component fills its parent's height (set by
    // the page) and owns the only scrollbar. No ancestor should also scroll.
    <div className="flex flex-col h-full min-h-0 bg-background">
      {/* Scrollable message list */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-6">
          {showWelcome && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                What would you like to learn?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-md">
                Ask me anything — I remember the conversation, so you can go deeper with follow-ups.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
                {STARTER_TOPICS.map((topic) => {
                  const Icon = topic.icon;
                  return (
                    <button
                      key={topic.title}
                      onClick={() => onSendMessage(`Tell me about ${topic.title}`)}
                      className="group flex items-start gap-3 p-4 bg-card rounded-xl border border-border hover:border-primary/50 hover:shadow-md transition-all text-left"
                    >
                      <Icon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {topic.title}
                        </span>
                        <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                          {topic.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Messages — ONE consistent renderer for every AI turn, always. */}
          <div className="space-y-6">
            {messages.map((message, index) => (
              <div key={message.id || index}>
                {message.sender === 'user' ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] bg-primary/10 rounded-2xl rounded-tr-sm px-4 py-2.5">
                      <p className="text-foreground whitespace-pre-wrap text-sm leading-relaxed">{message.text}</p>
                    </div>
                  </div>
                ) : (
                  <MessageBubble
                    message={message}
                    isCurrentUser={false}
                    onRetry={onRetry}
                    onExpand={
                      !message.isTyping && onExpandMessage
                        ? () => {
                            const prevUser = [...messages.slice(0, index)].reverse().find(m => m.sender === 'user');
                            onExpandMessage(message.id, prevUser?.text || message.text);
                          }
                        : undefined
                    }
                    isExpanding={expandingIds.includes(message.id)}
                    hasExtras={!!(message as EnhancedMessage).enhancedContent?.suggestions}
                    onTopicClick={(topic) => onSendMessage(`Tell me about ${topic}`)}
                  />
                )}
              </div>
            ))}
          </div>

          {isLoading && messages[messages.length - 1]?.sender !== 'ai' && (
            <div className="flex items-center gap-2 text-muted-foreground mt-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Thinking…</span>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center text-center text-destructive space-y-2 mt-4">
              <p className="text-sm">{error}</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="text-sm px-4 py-1.5 border border-border rounded-md hover:border-primary/50 text-foreground hover:text-primary transition-colors"
                >
                  Retry
                </button>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Composer — fixed at the bottom of this component, not the page */}
      <div className="border-t border-border bg-background/95 backdrop-blur-sm px-4 py-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message A…"
              rows={1}
              maxLength={5000}
              className="flex-1 p-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none max-h-[150px]"
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${target.scrollHeight}px`;
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
              className="p-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center justify-between mt-1.5 text-[11px] text-muted-foreground">
            <span>{!isFeatureCheckLoading && usageLabel}</span>
            <span>{input.length}/5000</span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;

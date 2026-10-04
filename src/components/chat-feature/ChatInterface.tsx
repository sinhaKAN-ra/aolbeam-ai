"use client";

import React, { useRef, useEffect, useState } from 'react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { toast } from 'sonner';
import type {
  Message,
  LearningPath,
  TopicTag,
  TopicSuggestion,
  EnhancedMessage,
  ChatSession,
} from '../../types/chat-feature';
import ChatMessage from './ChatMessage';
import ChatHistoryRail from './ChatHistoryRail';
import { Send, Loader2, Sparkles, Brain, Zap, BookOpen, Target, PanelLeft, X } from 'lucide-react';
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
  onNewChat: () => Promise<string> | string;
  topicSuggestions: TopicSuggestion[];
  topicTags: TopicTag[];
  selectedTags: string[];
  onTopicTagClick: (tag: TopicTag) => void;
  onCustomPathCreated: (pathId: string) => void;
  onExpandMessage?: (messageId: string, topic: string) => void;
  expandingIds?: string[];
  // History rail
  sessions: ChatSession[];
  currentSessionId: string | null;
  onDeleteSession: (sessionId: string) => Promise<boolean> | void;
  onRenameSession: (sessionId: string, title: string) => Promise<boolean> | void;
}

const STARTER_TOPICS = [
  { title: 'Machine Learning', description: 'Neural networks, algorithms & fundamentals', icon: Brain },
  { title: 'Quantum Physics', description: 'Superposition, entanglement & computing', icon: Zap },
  { title: 'Web Development', description: 'Modern web tech & best practices', icon: BookOpen },
  { title: 'Data Science', description: 'Analysis, visualization & statistics', icon: Target },
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
  onNewChat,
  sessions,
  currentSessionId,
  onDeleteSession,
  onRenameSession,
}: ChatInterfaceProps) => {
  const [input, setInput] = useState('');
  const [railOpen, setRailOpen] = useState(false); // mobile drawer

  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { canUseFeature, isLoading: isFeatureCheckLoading, refetchUsage } = useFeatureAccess();

  // Auto-scroll to the bottom on new turn / streamed token.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    try {
      onSendMessage(text);
      setInput('');
      if (inputRef.current) inputRef.current.style.height = 'auto';
      refetchUsage().catch(() => {});
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Failed to send message. Please try again.');
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
      return `${remaining} of ${limit} messages left today`;
    }
    const guestLeft = guestChatRemaining();
    return `${guestLeft} free message${guestLeft === 1 ? '' : 's'} left · sign in for more`;
  })();

  const showWelcome = isNewSession && messages.length === 0;

  return (
    <div className="flex h-full min-h-0 bg-background">
      {/* Thin custom scrollbar for the message column + rail */}
      <style jsx global>{`
        .chat-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .chat-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .chat-scroll::-webkit-scrollbar-thumb {
          background-color: hsl(var(--muted-foreground) / 0.25);
          border-radius: 9999px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
        .chat-scroll::-webkit-scrollbar-thumb:hover {
          background-color: hsl(var(--muted-foreground) / 0.45);
        }
        .chat-scroll {
          scrollbar-width: thin;
          scrollbar-color: hsl(var(--muted-foreground) / 0.25) transparent;
        }
      `}</style>

      {/* ── History rail (desktop) ── */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-border md:block">
        <ChatHistoryRail
          sessions={sessions}
          currentSessionId={currentSessionId}
          onNewChat={onNewChat}
          onDeleteSession={onDeleteSession}
          onRenameSession={onRenameSession}
        />
      </aside>

      {/* ── History rail (mobile drawer) ── */}
      {railOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setRailOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 border-r border-border bg-background shadow-xl">
            <div className="flex items-center justify-between border-b border-border p-3">
              <span className="text-sm font-medium text-foreground">Chats</span>
              <button onClick={() => setRailOpen(false)} aria-label="Close" className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="h-[calc(100%-3.25rem)]">
              <ChatHistoryRail
                sessions={sessions}
                currentSessionId={currentSessionId}
                onNewChat={onNewChat}
                onDeleteSession={onDeleteSession}
                onRenameSession={onRenameSession}
                onClose={() => setRailOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Conversation column (the ONLY scroll owner on this page) ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Compact header — mobile rail toggle */}
        <div className="flex h-12 flex-shrink-0 items-center gap-2 border-b border-border px-3 md:hidden">
          <button onClick={() => setRailOpen(true)} aria-label="Open chats" className="text-muted-foreground hover:text-foreground">
            <PanelLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium text-foreground">Chat</span>
        </div>

        <div ref={scrollRef} className="chat-scroll min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-6">
            {showWelcome ? (
              <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h2 className="mb-2 text-2xl font-bold text-foreground md:text-3xl">
                  What would you like to learn?
                </h2>
                <p className="mb-8 max-w-md text-muted-foreground">
                  Ask anything — I remember the conversation, so you can go deeper with follow-ups.
                </p>
                <div className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
                  {STARTER_TOPICS.map((topic) => {
                    const Icon = topic.icon;
                    return (
                      <button
                        key={topic.title}
                        onClick={() => onSendMessage(`Tell me about ${topic.title}`)}
                        className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/50 hover:shadow-md"
                      >
                        <Icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                        <div>
                          <span className="font-medium text-foreground transition-colors group-hover:text-primary">
                            {topic.title}
                          </span>
                          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                            {topic.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-7">
                {messages.map((message, index) => (
                  <ChatMessage
                    key={message.id || index}
                    message={message}
                    onExpand={
                      message.sender === 'ai' && !message.isTyping && onExpandMessage
                        ? () => {
                            const prevUser = [...messages.slice(0, index)]
                              .reverse()
                              .find((m) => m.sender === 'user');
                            onExpandMessage(message.id, prevUser?.text || message.text);
                          }
                        : undefined
                    }
                    isExpanding={expandingIds.includes(message.id)}
                    hasExtras={!!(message as EnhancedMessage).enhancedContent?.suggestions}
                    onTopicClick={(topic) => onSendMessage(`Tell me about ${topic}`)}
                  />
                ))}

                {isLoading && messages[messages.length - 1]?.sender !== 'ai' && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Thinking…</span>
                  </div>
                )}

                {error && (
                  <div className="flex flex-col items-center space-y-2 text-center text-destructive">
                    <p className="text-sm">{error}</p>
                    {onRetry && (
                      <button
                        onClick={onRetry}
                        className="rounded-md border border-border px-4 py-1.5 text-sm text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ── Composer (fixed to this column, not the page) ── */}
        <div className="flex-shrink-0 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
            <div className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message A…"
                rows={1}
                maxLength={5000}
                className="max-h-[160px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none"
                onInput={(e) => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = 'auto';
                  t.style.height = `${t.scrollHeight}px`;
                }}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                aria-label="Send message"
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            <div className="mt-1.5 flex items-center justify-between px-1 text-[11px] text-muted-foreground">
              <span>{!isFeatureCheckLoading && usageLabel}</span>
              <span>{input.length}/5000</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;

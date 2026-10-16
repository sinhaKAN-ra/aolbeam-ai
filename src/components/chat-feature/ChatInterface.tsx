"use client";

import React, { useRef, useEffect, useState } from "react";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { toast } from "sonner";
import type {
  Message,
  LearningPath,
  TopicTag,
  TopicSuggestion,
  EnhancedMessage,
  ChatSession,
} from "../../types/chat-feature";
import ChatMessage from "./ChatMessage";
import ChatHistoryRail from "./ChatHistoryRail";
import {
  Send,
  Loader2,
  Sparkles,
  Brain,
  Zap,
  BookOpen,
  Target,
  PanelLeft,
  X,
  ArrowDown,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import Link from "next/link";
import { guestChatRemaining } from "@/lib/guestTrial";

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
  onRenameSession: (
    sessionId: string,
    title: string,
  ) => Promise<boolean> | void;
}

const STARTER_TOPICS = [
  {
    title: "Explain a concept",
    description: "Break a tricky idea into simple steps.",
    icon: Brain,
    prompt:
      "Help me understand a concept. First ask which subject and topic I am studying and what I already know.",
  },
  {
    title: "Work through a problem",
    description: "Find the reasoning, one step at a time.",
    icon: Zap,
    prompt:
      "Help me solve a practice problem step by step. Ask me to share the question, then guide me with hints before giving the answer.",
  },
  {
    title: "Test my understanding",
    description: "A little challenge to see what sticks.",
    icon: BookOpen,
    prompt:
      "Quiz me on a topic I am studying. Ask for the topic and level first, then give me one question at a time with feedback.",
  },
  {
    title: "Make a revision plan",
    description: "Bring some direction to your study time.",
    icon: Target,
    prompt:
      "Help me plan my exam revision. Ask about my exam, subjects, available time and weak areas first.",
  },
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
  const [input, setInput] = useState("");
  const [railOpen, setRailOpen] = useState(false); // mobile drawer
  const [showJump, setShowJump] = useState(false); // "scroll to bottom" pill

  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Whether the view is pinned to the bottom. While true, new tokens keep the
  // view at the bottom; once the user scrolls up to read, this flips false and
  // streaming NO LONGER yanks them down (modern chat behaviour).
  const stickToBottom = useRef(true);
  const prevMsgCount = useRef(0);

  const {
    canUseFeature,
    isLoading: isFeatureCheckLoading,
    refetchUsage,
  } = useFeatureAccess();

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
    stickToBottom.current = true;
    setShowJump(false);
  };

  // Track whether the user is near the bottom. ~80px tolerance so a tiny gap
  // still counts as "at the bottom".
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom < 80;
    stickToBottom.current = atBottom;
    setShowJump(!atBottom);
  };

  // On message change: if a NEW message was added (user sent, or a new AI turn
  // began) force a scroll; otherwise (streaming tokens into the same message)
  // only follow if the user is still pinned to the bottom.
  useEffect(() => {
    if (messages.length === 0) {
      prevMsgCount.current = 0;
      stickToBottom.current = true;
      setShowJump(false);
      scrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
      return;
    }
    const isNewMessage = messages.length > prevMsgCount.current;
    prevMsgCount.current = messages.length;

    const lastIsUser = messages[messages.length - 1]?.sender === "user";
    if (isNewMessage && lastIsUser) {
      // User just sent — always jump so they see their message + the reply form.
      scrollToBottom("smooth");
    } else if (stickToBottom.current) {
      // Streaming or new AI turn while pinned — keep following, no animation jank.
      messagesEndRef.current?.scrollIntoView({
        behavior: "auto",
        block: "end",
      });
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    try {
      onSendMessage(text);
      setInput("");
      if (inputRef.current) inputRef.current.style.height = "auto";
      refetchUsage().catch(() => {});
    } catch (err) {
      console.error("Error sending message:", err);
      toast.error("Failed to send message. Please try again.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const usageLabel = (() => {
    const { remaining, limit } = canUseFeature("chat");
    if (typeof remaining === "number" && typeof limit === "number") {
      return `${remaining} of ${limit} messages left today`;
    }
    const guestLeft = guestChatRemaining();
    return `${guestLeft} free message${guestLeft === 1 ? "" : "s"} left · sign in for more`;
  })();

  const showWelcome = messages.length === 0;

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
      <aside className="hidden w-56 flex-shrink-0 border-r border-border xl:block">
        <ChatHistoryRail
          sessions={sessions}
          currentSessionId={currentSessionId}
          onNewChat={onNewChat}
          onDeleteSession={onDeleteSession}
          onRenameSession={onRenameSession}
        />
      </aside>

      <Sheet open={railOpen} onOpenChange={setRailOpen}>
        <SheetContent side="left" className="w-80 p-0">
          <SheetHeader className="border-b p-4 pr-12">
            <SheetTitle className="text-sm">Your conversations</SheetTitle>
            <SheetDescription className="text-xs">
              Pick up a question where you left off.
            </SheetDescription>
          </SheetHeader>
          <div className="h-[calc(100%-5rem)]">
            <ChatHistoryRail
              sessions={sessions}
              currentSessionId={currentSessionId}
              onNewChat={onNewChat}
              onDeleteSession={onDeleteSession}
              onRenameSession={onRenameSession}
              onClose={() => setRailOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Conversation column (the ONLY scroll owner on this page) ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-card/40 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setRailOpen(true)}
              aria-label="Open conversations"
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted xl:hidden"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </span>
            <span className="text-xs font-semibold">Your AI tutor</span>
            <span className="hidden text-[10px] text-muted-foreground sm:block">
              Room for every question.
            </span>
          </div>
          <Link
            href="/learning-paths"
            className="text-[11px] text-muted-foreground transition-colors hover:text-primary"
          >
            My learning paths ↗
          </Link>
        </div>

        <div className="relative min-h-0 flex-1">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="chat-scroll h-full overflow-y-auto"
          >
            <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-6">
              {showWelcome ? (
                <div className="flex min-h-[48vh] py-8 flex-col items-center justify-center text-center">
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="mb-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                    Let’s untangle it, together.
                  </h2>
                  <p className="mb-8 max-w-md text-muted-foreground">
                    A difficult concept, a question you’re stuck on, or a
                    curious “what if.” There’s a good place to start.
                  </p>
                  <div className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
                    {STARTER_TOPICS.map((topic) => {
                      const Icon = topic.icon;
                      return (
                        <button
                          key={topic.title}
                          onClick={() => onSendMessage(topic.prompt)}
                          className="group flex items-start gap-3 rounded-2xl border border-border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
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
                        message.sender === "ai" &&
                        !message.isTyping &&
                        onExpandMessage
                          ? () => {
                              const prevUser = [...messages.slice(0, index)]
                                .reverse()
                                .find((m) => m.sender === "user");
                              onExpandMessage(
                                message.id,
                                prevUser?.text || message.text,
                              );
                            }
                          : undefined
                      }
                      isExpanding={expandingIds.includes(message.id)}
                      hasExtras={(() => {
                        const ec = (message as EnhancedMessage).enhancedContent;
                        // Only "has extras" when there is actually something to
                        // show — an empty suggestions:[] from a failed/empty
                        // fetch must NOT hide the Expand button or render a blank panel.
                        return !!(
                          (ec?.suggestions && ec.suggestions.length) ||
                          (ec?.branchingPaths && ec.branchingPaths.length) ||
                          (ec?.resources && ec.resources.length) ||
                          (ec?.practiceProblems && ec.practiceProblems.length)
                        );
                      })()}
                      onTopicClick={(topic) =>
                        onSendMessage(`Tell me about ${topic}`)
                      }
                    />
                  ))}

                  {isLoading &&
                    messages[messages.length - 1]?.sender !== "ai" && (
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

          {/* Floating "jump to latest" — shows only when scrolled up */}
          {showJump && (
            <button
              onClick={() => scrollToBottom("smooth")}
              aria-label="Scroll to latest"
              className="absolute bottom-4 left-1/2 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-lg transition-colors hover:bg-muted"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* ── Composer (fixed to this column, not the page) ── */}
        <div className="flex-shrink-0 bg-background/95 px-4 pb-4 pt-3 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
            <div className="flex items-end gap-2 rounded-2xl border border-border bg-card p-3 shadow-sm focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                aria-label="Message your AI tutor"
                placeholder="Ask a question, work through an idea…"
                rows={1}
                maxLength={5000}
                className="max-h-[160px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none"
                onInput={(e) => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = "auto";
                  t.style.height = `${t.scrollHeight}px`;
                }}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                aria-label="Send message"
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            <div className="mt-1.5 flex items-center justify-between px-1 text-[11px] text-muted-foreground">
              <span>{!isFeatureCheckLoading && usageLabel}</span>
              <span className="hidden sm:inline">
                Enter to send · Shift + Enter for a new line
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;

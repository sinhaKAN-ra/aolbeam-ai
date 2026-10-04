"use client";

import React, { useState } from 'react';
import { Message } from '../../types/chat-feature/index';
import type { EnhancedMessage } from '../../types/chat-feature/enhanced-message';
import { Sparkles, Lightbulb, ExternalLink, Route, Loader2, Copy, Check, FileDown } from 'lucide-react';
import ChatMarkdown from '@/components/chat-feature/ChatMarkdown';
import { downloadMarkdown } from '@/lib/downloadResponse';

interface ChatMessageProps {
  message: Message;
  /** Open the on-demand "learning extras" panel for this AI message. */
  onExpand?: () => void;
  isExpanding?: boolean;
  hasExtras?: boolean;
  /** Click a related topic / starter → send it as the next message. */
  onTopicClick?: (topic: string) => void;
}

/**
 * ONE renderer for every turn — modern, borderless chat (ChatGPT / Claude style).
 *
 * - User turns: an understated right-aligned muted pill.
 * - AI turns: BORDERLESS, full reading-width, just the rendered content with a
 *   small assistant glyph in the gutter and a hover action row (copy).
 *   The learning "extras" render as an inline accessory UNDER the same message —
 *   never a renderer swap.
 */
const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onExpand,
  isExpanding,
  hasExtras,
  onTopicClick,
}) => {
  const isUser = message.sender === 'user';
  const extras = (message as EnhancedMessage).enhancedContent;
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.text || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — no-op */
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-muted px-4 py-2.5">
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
            {message.text}
          </p>
        </div>
      </div>
    );
  }

  // ── AI turn: borderless ──────────────────────────────────────────────
  return (
    <div className="group flex gap-3 md:gap-4">
      <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-[15px] leading-relaxed text-foreground">
          <ChatMarkdown content={message.text} />
          {message.isTyping && (
            <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-foreground/70 align-middle" />
          )}
        </div>

        {/* Practice-problems-list message type */}
        {message.type === 'practice_problems_list' && message.problems && message.problems.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Lightbulb className="h-4 w-4 text-amber-500" /> Practice problems
            </h4>
            <div className="grid gap-2">
              {message.problems.map((problem, i) => {
                if (!problem) return null;
                const text = typeof problem === 'string' ? problem : JSON.stringify(problem);
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-lg border border-border bg-card/50 p-3"
                  >
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-xs font-medium text-amber-600 dark:text-amber-400">
                      {i + 1}
                    </span>
                    <span className="text-sm leading-relaxed text-foreground">{text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Hover action row + Expand — only once the turn has finished streaming */}
        {!message.isTyping && (
          <div className="mt-1.5 flex items-center gap-3">
            <button
              onClick={copy}
              aria-label="Copy message"
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>

            <button
              onClick={() => downloadMarkdown(message.text || '', message.text?.slice(0, 40))}
              aria-label="Download as Markdown"
              title="Download as Markdown (.md)"
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
            >
              <FileDown className="h-3.5 w-3.5" /> Download .md
            </button>

            {onExpand && !hasExtras && (
              <button
                onClick={onExpand}
                disabled={isExpanding}
                className="inline-flex items-center gap-1.5 text-xs text-primary transition-colors hover:text-primary/80 disabled:opacity-50"
              >
                {isExpanding ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" /> Expand with suggestions &amp; resources
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Inline extras accessory (same message, never a renderer swap) */}
        {hasExtras && extras && (
          <div className="mt-3 space-y-4 border-l-2 border-border/60 pl-4">
            {extras.suggestions && extras.suggestions.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Lightbulb className="h-3.5 w-3.5" /> Related topics
                </h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {extras.suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onTopicClick?.(s.title)}
                      disabled={!onTopicClick}
                      className="rounded-lg border border-border bg-card p-3 text-left transition-all hover:border-primary/50 hover:shadow-sm disabled:cursor-default"
                    >
                      <p className="text-sm font-medium text-foreground">{s.title}</p>
                      {s.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{s.description}</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {extras.branchingPaths && extras.branchingPaths.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Route className="h-3.5 w-3.5" /> Learning path
                </h4>
                <ol className="space-y-1.5">
                  {extras.branchingPaths.map((step, i) => (
                    <li key={step.id} className="flex gap-2 text-sm">
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
                        {i + 1}
                      </span>
                      <span className="text-foreground">{step.title}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {extras.resources && extras.resources.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <ExternalLink className="h-3.5 w-3.5" /> Resources
                </h4>
                <ul className="space-y-1">
                  {extras.resources.map((r) => (
                    <li key={r.id}>
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        {r.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {extras.practiceProblems && extras.practiceProblems.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-500" /> Practice problems
                </h4>
                <ul className="space-y-1.5">
                  {extras.practiceProblems.map((p, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-xs text-amber-600 dark:text-amber-400">
                        {i + 1}
                      </span>
                      <span className="text-foreground">{p.question}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;

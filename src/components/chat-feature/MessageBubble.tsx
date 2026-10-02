import React from 'react';
import { Message } from '../../types/chat-feature/index';
import type { EnhancedMessage } from '../../types/chat-feature/enhanced-message';
import { Bot, Lightbulb, Sparkles, Loader2, ExternalLink, Route } from 'lucide-react';
import ChatMarkdown from '@/components/chat-feature/ChatMarkdown';

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  onRetry?: () => void; // Make onRetry optional
  onExpand?: () => void;
  isExpanding?: boolean;
  hasExtras?: boolean;
  onTopicClick?: (topic: string) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isCurrentUser, onRetry, onExpand, isExpanding, hasExtras, onTopicClick }) => {
  const isUser = message.sender === 'user';
  const extras = (message as EnhancedMessage).enhancedContent;
  
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
              <div className="text-foreground leading-relaxed">
                <ChatMarkdown content={message.text} />
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

            {/* Phase B: on-demand learning extras */}
            {onExpand && !hasExtras && (
              <button
                onClick={onExpand}
                disabled={isExpanding}
                className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
              >
                {isExpanding ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading learning extras…</>
                ) : (
                  <><Sparkles className="w-3.5 h-3.5" /> Expand with suggestions, path &amp; resources</>
                )}
              </button>
            )}

            {hasExtras && extras && (
              <div className="mt-3 space-y-4">
                {extras.suggestions && extras.suggestions.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5" /> Related topics
                    </h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {extras.suggestions.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => onTopicClick?.(s.title)}
                          disabled={!onTopicClick}
                          className="p-3 rounded-lg border border-border bg-card text-left hover:border-primary/50 hover:shadow-sm transition-all disabled:cursor-default disabled:hover:border-border disabled:hover:shadow-none"
                        >
                          <p className="text-sm font-medium text-foreground">{s.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {extras.branchingPaths && extras.branchingPaths.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Route className="w-3.5 h-3.5" /> Learning path
                    </h4>
                    <ol className="space-y-1.5">
                      {extras.branchingPaths.map((step, i) => (
                        <li key={step.id} className="flex gap-2 text-sm">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center">{i + 1}</span>
                          <span className="text-foreground">{step.title}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {extras.resources && extras.resources.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5" /> Resources
                    </h4>
                    <ul className="space-y-1">
                      {extras.resources.map((r) => (
                        <li key={r.id}>
                          <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                            {r.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {extras.practiceProblems && extras.practiceProblems.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-yellow-500" /> Practice problems
                    </h4>
                    <ul className="space-y-1.5">
                      {extras.practiceProblems.map((p, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-yellow-100 text-yellow-700 text-xs flex items-center justify-center">{i + 1}</span>
                          <span className="text-foreground">{p.question}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
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
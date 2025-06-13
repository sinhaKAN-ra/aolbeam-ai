import React, { useState, useCallback } from 'react';
import { ChatSession, ChatMessage } from '@/types/chat-feature';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, parseISO } from 'date-fns';
import { Edit, Trash2, Plus, Check, X } from 'lucide-react';

// Helper function to format dates
const formatDate = (dateString: string): string => {
  try {
    return format(parseISO(dateString), 'MMM d, yyyy h:mm a');
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

interface ChatHistorySidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onCreateNewSession: () => Promise<string | null>;
  onDeleteSession: (sessionId: string) => Promise<boolean>;
  onUpdateSessionTitle: (sessionId: string, newTitle: string) => Promise<boolean>;
  isLoading?: boolean;
  className?: string;
}

export function ChatHistorySidebar({
  sessions,
  currentSessionId,
  onSelectSession,
  onCreateNewSession,
  onDeleteSession,
  onUpdateSessionTitle,
  isLoading = false,
  className = '',
}: ChatHistorySidebarProps) {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleStartEditing = (session: ChatSession) => {
    setEditingSessionId(session.id);
    setNewTitle(session.title);
  };

  const handleSaveTitle = async (sessionId: string) => {
    const success = await onUpdateSessionTitle(sessionId, newTitle.trim());
    if (success) {
      setEditingSessionId(null);
    }
  };

  const handleCancelEditing = () => {
    setEditingSessionId(null);
    setNewTitle('');
  };

  const handleCreateNewSession = async () => {
    setIsCreating(true);
    try {
      await onCreateNewSession();
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      // If date is today, show time, otherwise show date
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      
      if (isToday) {
        return format(date, 'h:mm a');
      } else {
        return format(date, 'MMM d, yyyy');
      }
    } catch (e) {
      return '';
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-2">Chat History</h2>
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={handleCreateNewSession}
          disabled={isLoading || isCreating}
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900 dark:border-gray-50"></div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center p-4 text-sm text-gray-500">
              No chat history yet
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`group relative rounded-md p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${
                  currentSessionId === session.id
                    ? 'bg-gray-100 dark:bg-gray-800 font-medium'
                    : ''
                }`}
                onClick={() => onSelectSession(session.id)}
              >
                {editingSessionId === session.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-8 flex-1"
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveTitle(session.id);
                      }}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelEditing();
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between">
                      <span className="truncate flex-1">{session.title}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        {formatDate(session.updatedAt)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {session.messages && session.messages.length > 0
                        ? (() => {
                            const lastMessage = session.messages[session.messages.length - 1];
                            const content = lastMessage?.content || '';
                            const truncated = content.length > 50 ? `${content.substring(0, 50)}...` : content;
                            return truncated || 'No message content';
                          })()
                        : 'No messages'}
                    </div>
                  </div>
                )}
                
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartEditing(session);
                    }}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-500 hover:text-red-600"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (confirm('Are you sure you want to delete this chat?')) {
                        await onDeleteSession(session.id);
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default ChatHistorySidebar;

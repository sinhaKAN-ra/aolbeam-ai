import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, parseISO } from 'date-fns';
import { Edit, Trash2, Plus, Check, X, MoreVertical } from 'lucide-react';

// Mock types for demo
interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

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

// Demo component with mock data
export function ChatHistorySidebar({
  sessions: propSessions,
  currentSessionId: propCurrentSessionId,
  onSelectSession: propOnSelectSession,
  onCreateNewSession: propOnCreateNewSession,
  onDeleteSession: propOnDeleteSession,
  onUpdateSessionTitle: propOnUpdateSessionTitle,
  isLoading = false,
  className = '',
}: Partial<ChatHistorySidebarProps>) {
  // Mock data for demo
  const [sessions, setSessions] = useState<ChatSession[]>([
    {
      id: '1',
      title: 'React Component Design Discussion',
      messages: [
        { id: '1', content: 'How do I create a responsive sidebar?', role: 'user', timestamp: new Date().toISOString() }
      ],
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: '2',
      title: 'TypeScript Best Practices',
      messages: [
        { id: '2', content: 'What are some TypeScript best practices for React?', role: 'user', timestamp: new Date().toISOString() }
      ],
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: '3',
      title: 'API Integration Help',
      messages: [
        { id: '3', content: 'I need help integrating a REST API with my React app', role: 'user', timestamp: new Date().toISOString() }
      ],
      createdAt: new Date(Date.now() - 259200000).toISOString(),
      updatedAt: new Date(Date.now() - 7200000).toISOString()
    }
  ]);

  const [currentSessionId, setCurrentSessionId] = useState<string | null>('1');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStartEditing = (session: ChatSession) => {
    setEditingSessionId(session.id);
    setNewTitle(session.title);
    setActiveMenuId(null);
  };

  const handleSaveTitle = async (sessionId: string) => {
    // Mock update
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, title: newTitle.trim() } : s
    ));
    setEditingSessionId(null);
  };

  const handleCancelEditing = () => {
    setEditingSessionId(null);
    setNewTitle('');
  };

  const handleCreateNewSession = async () => {
    setIsCreating(true);
    try {
      // Mock create new session
      const newSession: ChatSession = {
        id: Date.now().toString(),
        title: `New Chat ${sessions.length + 1}`,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (confirm('Are you sure you want to delete this chat?')) {
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        setCurrentSessionId(sessions.length > 1 ? sessions.find(s => s.id !== sessionId)?.id || null : null);
      }
    }
    setActiveMenuId(null);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      
      if (isToday) {
        return format(date, 'h:mm a');
      } else {
        return format(date, 'MMM d');
      }
    } catch (e) {
      return '';
    }
  };

  const toggleMenu = (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setActiveMenuId(activeMenuId === sessionId ? null : sessionId);
  };

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <Button
          variant="outline"
          className="w-full justify-start gap-2 h-9 text-sm"
          onClick={handleCreateNewSession}
          disabled={isLoading || isCreating}
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>
      
      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="p-1">
          {isLoading ? (
            <div className="flex justify-center p-6">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center p-6 text-sm text-gray-500">
              No chat history yet
            </div>
          ) : (
            sessions.map((session) => (
              <div key={session.id} className="relative">
                <div
                  className={`group relative rounded-lg p-3 m-1 cursor-pointer transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    currentSessionId === session.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                      : 'hover:shadow-sm'
                  }`}
                  onClick={() => setCurrentSessionId(session.id)}
                >
                  {editingSessionId === session.id ? (
                    <div className="space-y-2">
                      <Input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-8 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveTitle(session.id);
                          } else if (e.key === 'Escape') {
                            handleCancelEditing();
                          }
                        }}
                      />
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveTitle(session.id);
                          }}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelEditing();
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate leading-tight">
                            {session.title}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                            {session.messages && session.messages.length > 0
                              ? (() => {
                                  const lastMessage = session.messages[session.messages.length - 1];
                                  const content = lastMessage?.content || '';
                                  return content.length > 60 ? `${content.substring(0, 60)}...` : content || 'No message content';
                                })()
                              : 'No messages'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-400 whitespace-nowrap">
                            {formatDate(session.updatedAt)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => toggleMenu(session.id, e)}
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Dropdown Menu */}
                {activeMenuId === session.id && (
                  <div 
                    ref={menuRef}
                    className="absolute right-2 top-12 z-50 w-40 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1"
                  >
                    <button
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEditing(session);
                      }}
                    >
                      <Edit className="h-3 w-3" />
                      Rename
                    </button>
                    <button
                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSession(session.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default ChatHistorySidebar;
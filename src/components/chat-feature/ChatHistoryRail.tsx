"use client";

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ChatSession } from '@/types/chat-feature';
import { Plus, MessageSquare, Pencil, Trash2, Check, X } from 'lucide-react';

interface ChatHistoryRailProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onNewChat: () => Promise<string> | string;
  onDeleteSession: (sessionId: string) => Promise<boolean> | void;
  onRenameSession: (sessionId: string, title: string) => Promise<boolean> | void;
  /** Mobile drawer: closes the rail after an action. */
  onClose?: () => void;
}

type Group = { label: string; sessions: ChatSession[] };

function groupSessions(sessions: ChatSession[]): Group[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 86_400_000;

  const buckets: Record<string, ChatSession[]> = {
    Today: [],
    Yesterday: [],
    'Previous 7 days': [],
    Older: [],
  };

  // Newest first by updatedAt (falling back to createdAt).
  const sorted = [...sessions].sort((a, b) => {
    const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return tb - ta;
  });

  for (const s of sorted) {
    const t = new Date(s.updatedAt || s.createdAt || 0).getTime();
    if (t >= startOfToday) buckets.Today.push(s);
    else if (t >= startOfToday - dayMs) buckets.Yesterday.push(s);
    else if (t >= startOfToday - 7 * dayMs) buckets['Previous 7 days'].push(s);
    else buckets.Older.push(s);
  }

  return Object.entries(buckets)
    .filter(([, list]) => list.length > 0)
    .map(([label, list]) => ({ label, sessions: list }));
}

const ChatHistoryRail: React.FC<ChatHistoryRailProps> = ({
  sessions,
  currentSessionId,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  onClose,
}) => {
  const router = useRouter();
  const groups = useMemo(() => groupSessions(sessions), [sessions]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const openSession = (id: string) => {
    if (id === currentSessionId) {
      onClose?.();
      return;
    }
    router.push(`/chat/${id}`);
    onClose?.();
  };

  const startNew = async () => {
    const id = await onNewChat();
    if (typeof id === 'string' && id) router.push(`/chat/${id}`);
    onClose?.();
  };

  const beginRename = (s: ChatSession) => {
    setEditingId(s.id);
    setDraftTitle(s.title || 'New Chat');
  };

  const commitRename = async (id: string) => {
    const title = draftTitle.trim();
    if (title) await onRenameSession(id, title);
    setEditingId(null);
  };

  const confirmDelete = async (id: string) => {
    await onDeleteSession(id);
    setConfirmDeleteId(null);
    // If we just deleted the open session, go to a fresh chat.
    if (id === currentSessionId) {
      const remaining = sessions.filter((s) => s.id !== id);
      if (remaining[0]) router.push(`/chat/${remaining[0].id}`);
      else await startNew();
    }
  };

  return (
    <div className="flex h-full flex-col bg-card/40">
      <div className="p-3">
        <button
          onClick={startNew}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> New Chat
        </button>
      </div>

      <div className="chat-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {groups.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            No conversations yet. Start a new chat.
          </p>
        )}

        {groups.map((group) => (
          <div key={group.label} className="mb-3">
            <h3 className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
            </h3>
            <ul className="space-y-0.5">
              {group.sessions.map((s) => {
                const active = s.id === currentSessionId;
                const editing = editingId === s.id;
                const deleting = confirmDeleteId === s.id;

                return (
                  <li key={s.id}>
                    {editing ? (
                      <div className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1.5">
                        <input
                          autoFocus
                          value={draftTitle}
                          onChange={(e) => setDraftTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitRename(s.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none"
                        />
                        <button onClick={() => commitRename(s.id)} aria-label="Save title" className="text-muted-foreground hover:text-foreground">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setEditingId(null)} aria-label="Cancel rename" className="text-muted-foreground hover:text-foreground">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : deleting ? (
                      <div className="flex items-center gap-1 rounded-lg bg-destructive/10 px-2 py-1.5">
                        <span className="min-w-0 flex-1 truncate text-xs text-destructive">Delete this chat?</span>
                        <button onClick={() => confirmDelete(s.id)} aria-label="Confirm delete" className="text-destructive hover:text-destructive/80">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setConfirmDeleteId(null)} aria-label="Cancel delete" className="text-muted-foreground hover:text-foreground">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div
                        className={`group flex items-center gap-2 rounded-lg px-2 py-2 transition-colors ${
                          active ? 'bg-muted' : 'hover:bg-muted/60'
                        }`}
                      >
                        <button
                          onClick={() => openSession(s.id)}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <MessageSquare
                            className={`h-3.5 w-3.5 flex-shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`}
                          />
                          <span className={`truncate text-sm ${active ? 'font-medium text-foreground' : 'text-foreground/80'}`}>
                            {s.title || 'New Chat'}
                          </span>
                        </button>
                        <div className="flex flex-shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => beginRename(s)}
                            aria-label="Rename chat"
                            className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(s.id)}
                            aria-label="Delete chat"
                            className="rounded p-1 text-muted-foreground hover:bg-background hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatHistoryRail;

import { useState, useEffect, useCallback } from 'react';
import { ChatSession, ChatMessage, CHAT_HISTORY_STORAGE_KEY, MessageType } from '@/types/chat-feature';

interface LocalChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Array<{
    id: string;
    content: string;
    role: 'user' | 'assistant';
    timestamp: string;
    type: string;
  }>;
}
import supabase from '@/lib/supabase/client';

export const useChatHistory = (userId: string | null, initialSessionId?: string | null) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(initialSessionId || null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load chat history from the appropriate source based on auth state
  const loadChatHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
  
    try {
      if (userId) {
        console.log('Loading chat history for user:', userId);
        console.log('Current currentSessionId:', currentSessionId);
        
        // First, verify the user's session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          console.error('No active session found:', sessionError);
          throw new Error('Authentication required');
        }
  
        console.log('Active session found, fetching chat sessions...');
        
        // Try a simpler query first to isolate the issue
        console.log('Attempting simple query for chat sessions...');
        const { data: simpleData, error: simpleError } = await supabase
          .from('chat_sessions')
          .select('id') // Simplified select to test basic access
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (simpleError) {
          console.error('Error fetching chat sessions (simple query):', simpleError.message, simpleError.details, simpleError.hint);
          throw simpleError;
        }
        console.log('Simple query successful. Found', simpleData?.length, 'sessions.');

  
        if (simpleError) {
          console.error('Error fetching chat sessions (simple query):', simpleError);
          throw simpleError;
        }
  
        console.log('Successfully fetched', simpleData?.length, 'chat sessions');
        
        // If simple query works, try the full query with messages
        console.log('Attempting full query for chat sessions with messages...');
        const { data, error: fetchError } = await supabase
          .from('chat_sessions')
          .select(`
            id,
            title,
            created_at,
            updated_at,
            is_active,
            chat_messages (
              id,
              content,
              role,
              created_at,
              metadata
            )
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
  
        if (fetchError) {
          console.error('Error fetching chat sessions (full query):', fetchError.message, fetchError.details, fetchError.hint);
          throw fetchError;
        }
        console.log('Full query successful. Found', data?.length, 'sessions with messages.');
  
        console.log('Successfully fetched chat sessions with messages');
        
        const formattedSessions = (data || []).map(session => ({
          id: session.id,
          userId,
          title: session.title,
          createdAt: session.created_at,
          updatedAt: session.updated_at,
          isActive: session.is_active,
          messages: (session.chat_messages || []).map(msg => ({
            id: msg.id,
            sessionId: session.id,
            content: msg.content,
            role: msg.role as 'user' | 'assistant',
            createdAt: msg.created_at,
            metadata: msg.metadata || {}
          }))
        }));
  
        setSessions(formattedSessions);
        
        if (initialSessionId && formattedSessions.some(s => s.id === initialSessionId)) {
          setCurrentSessionId(initialSessionId);
        } else if (formattedSessions.length > 0 && !currentSessionId) {
          setCurrentSessionId(formattedSessions[0].id);
        }
      } else {
        // Load from localStorage for guest users
        console.log('Loading guest chat history from localStorage');
        console.log('Current currentSessionId:', currentSessionId);
        const savedHistory = localStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
        if (savedHistory) {
          const parsedHistory = JSON.parse(savedHistory) as LocalChatSession[];
          const formattedSessions = parsedHistory.map(session => ({
            id: session.id,
            userId: null,
            title: session.title,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            isActive: true,
            messages: session.messages.map(msg => ({
              id: msg.id,
              sessionId: session.id,
              content: msg.content,
              role: msg.role,
              createdAt: msg.timestamp,
              metadata: {
                type: msg.type
              }
            }))
          }));
          
          setSessions(
            formattedSessions.map(session => ({
              ...session,
              messages: session.messages.map(msg => ({
                ...msg,
                metadata: {
                  ...msg.metadata,
                  type: (msg.metadata?.type as MessageType) || 'text',
                },
              })),
            }))
          );
          if (formattedSessions.length > 0 && !currentSessionId) {
            setCurrentSessionId(formattedSessions[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Error loading chat history:', err);
      setError('Failed to load chat history');
    } finally {
      setIsLoading(false);
    }
  }, [userId, currentSessionId]);

  const saveMessage = useCallback(async (message: Omit<ChatMessage, 'id' | 'createdAt' | 'sessionId'> & { metadata?: Record<string, any> }) => {
    if (!currentSessionId) {
      console.log('saveMessage: No currentSessionId, returning null.');
      return null;
    }
  
    console.log('Saving message - current session state:', { 
      currentSessionId, 
      hasSession: !!sessions.find(s => s.id === currentSessionId),
      sessionCount: sessions.length,
      userId 
    });
  
    const newMessage: ChatMessage = {
      ...message,
      id: crypto.randomUUID(),
      sessionId: currentSessionId,
      createdAt: new Date().toISOString(),
      metadata: message.metadata || { type: 'text' }
    };
  
    try {
      if (userId) {
        // First, ensure the session exists and belongs to the user
        let currentSession = sessions.find(s => s.id === currentSessionId);
        let sessionNeedsUpdate = false;
  
        if (!currentSession) {
          console.log('Session not found in local state, checking database...');
          // Try to fetch from DB in case it's a new session not yet loaded
          const { data: dbSession, error: fetchError } = await supabase
            .from('chat_sessions')
            .select('id, user_id, title, created_at, updated_at, is_active')
            .eq('id', currentSessionId)
            .single();
  
          if (fetchError && fetchError.code === 'PGRST116') { // Not found
            console.log('Session not found in DB, creating new session');
            const { data: newSession, error: createError } = await supabase
              .from('chat_sessions')
              .insert({
                id: currentSessionId,
                user_id: userId,
                title: 'New Chat',
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single();
  
            if (createError) {
              console.error('Error creating session:', createError);
              throw createError;
            }
  
            currentSession = {
              id: newSession.id,
              userId: newSession.user_id,
              title: newSession.title,
              isActive: newSession.is_active,
              createdAt: newSession.created_at,
              updatedAt: newSession.updated_at,
              messages: []
            };
            sessionNeedsUpdate = true;
            console.log('Created new session:', currentSession);
          } else if (dbSession) {
            currentSession = {
              id: dbSession.id,
              userId: dbSession.user_id,
              title: dbSession.title,
              isActive: dbSession.is_active,
              createdAt: dbSession.created_at,
              updatedAt: dbSession.updated_at,
              messages: []
            };
            sessionNeedsUpdate = true;
            console.log('Found existing session in DB:', currentSession);
          }
        }
  
        // If session exists but is inactive, activate it
        if (currentSession && !currentSession.isActive) {
          console.log('Session is inactive, activating it');
          const { data: updatedSession, error: updateError } = await supabase
            .from('chat_sessions')
            .update({ 
              is_active: true, 
              updated_at: new Date().toISOString(),
              title: currentSession.title || 'New Chat'
            })
            .eq('id', currentSessionId)
            .select()
            .single();
  
          if (updateError) {
            console.error('Error updating session:', updateError);
            throw updateError;
          }
  
          currentSession = {
            ...currentSession,
            isActive: true,
            updatedAt: updatedSession.updated_at
          };
          sessionNeedsUpdate = true;
          console.log('Activated session:', currentSession);
        }
  
        // Save the message to the database
        const { error: messageError } = await supabase
          .from('chat_messages')
          .insert({
            id: newMessage.id,
            session_id: currentSessionId,
            content: newMessage.content,
            role: newMessage.role,
            created_at: newMessage.createdAt,
            metadata: newMessage.metadata
          });
  
        if (messageError) {
          console.error('Error saving message:', messageError);
          throw messageError;
        }
  
        // Update local state
        const updatedSession = {
          ...currentSession!,
          messages: [...(currentSession?.messages || []), newMessage],
          updatedAt: new Date().toISOString()
        };
  
        setSessions(prev => {
          const sessionIndex = prev.findIndex(s => s.id === currentSessionId);
          if (sessionIndex >= 0) {
            const updated = [...prev];
            updated[sessionIndex] = updatedSession;
            return updated;
          }
          return [...prev, updatedSession];
        });
  
        return newMessage;
      } else {
        // Handle guest user case
        const savedHistory = localStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
        const history: LocalChatSession[] = savedHistory ? JSON.parse(savedHistory) : [];
        const sessionIndex = history.findIndex(s => s.id === currentSessionId);
  
        if (sessionIndex >= 0) {
          // Update existing session
          history[sessionIndex] = {
            ...history[sessionIndex],
            messages: [...history[sessionIndex].messages, {
              id: newMessage.id,
              content: newMessage.content,
              role: newMessage.role,
              timestamp: newMessage.createdAt,
              type: newMessage.metadata?.type || 'text'
            }],
            updatedAt: new Date().toISOString()
          };
        } else {
          // Create new session
          history.unshift({
            id: currentSessionId,
            title: 'New Chat',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: [{
              id: newMessage.id,
              content: newMessage.content,
              role: newMessage.role,
              timestamp: newMessage.createdAt,
              type: newMessage.metadata?.type || 'text'
            }]
          });
        }
  
        localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(history));
        return newMessage;
      }
    } catch (error) {
      console.error('Error in saveMessage:', error);
      throw error;
    }
  }, [currentSessionId, sessions, userId]);

  // Create a new chat session
  const createNewSession = useCallback(async (title: string = 'New Chat') => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      userId: userId || 'guest',
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
      isActive: false, // Mark as inactive until first message
    };

    // Update local state immediately, but don't persist yet
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    return newSession.id;
  }, [userId]);

  // Delete a chat session
  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      if (userId) {
        // Delete from Supabase for authenticated users
        const { error } = await supabase
          .from('chat_sessions')
          .delete()
          .eq('id', sessionId);

        if (error) throw error;
      } else {
        // Delete from localStorage for guest users
        const savedHistory = localStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
        if (savedHistory) {
          const history: LocalChatSession[] = JSON.parse(savedHistory);
          const updatedHistory = history.filter(session => session.id !== sessionId);
          localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
        }
      }

      // Update local state
      setSessions(prev => prev.filter(session => session.id !== sessionId));
      if (currentSessionId === sessionId) {
        setCurrentSessionId(prev => {
          const remainingSessions = sessions.filter(s => s.id !== sessionId);
          return remainingSessions[0]?.id || null;
        });
      }
      return true;
    } catch (err) {
      console.error('Error deleting session:', err);
      return false;
    }
  }, [userId, currentSessionId, sessions, supabase]);

  // Update a session title
  const updateSessionTitle = useCallback(async (sessionId: string, newTitle: string) => {
    try {
      if (userId) {
        // Update in Supabase for authenticated users
        const { error } = await supabase
          .from('chat_sessions')
          .update({ 
            title: newTitle,
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);

        if (error) throw error;
      } else {
        // Update in localStorage for guest users
        const savedHistory = localStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
        if (savedHistory) {
          const history: LocalChatSession[] = JSON.parse(savedHistory);
          const updatedHistory = history.map(session =>
            session.id === sessionId
              ? { ...session, title: newTitle, updatedAt: new Date().toISOString() }
              : session
          );
          localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
        }
      }

      // Update local state
      setSessions(prev =>
        prev.map(session =>
          session.id === sessionId
            ? { ...session, title: newTitle, updatedAt: new Date().toISOString() }
            : session
        )
      );
      return true;
    } catch (err) {
      console.error('Error updating session title:', err);
      return false;
    }
  }, [userId, supabase]);

  // Load chat history when userId changes
  useEffect(() => {
    loadChatHistory();
  }, [loadChatHistory]);

  return {
    sessions,
    currentSession: sessions.find(s => s.id === currentSessionId) || null,
    currentSessionId,
    setCurrentSessionId,
    isLoading,
    error,
    saveMessage,
    createNewSession,
    deleteSession,
    updateSessionTitle,
    refreshChatHistory: loadChatHistory
  };
};

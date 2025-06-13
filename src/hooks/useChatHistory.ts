import { useState, useEffect, useCallback } from 'react';
import { ChatSession, ChatMessage, LocalChatSession, CHAT_HISTORY_STORAGE_KEY } from '@/types/chat-feature';
import supabase from '@/lib/supabase/client';

export const useChatHistory = (userId: string | null) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load chat history from the appropriate source based on auth state
  const loadChatHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (userId) {
        // Load from Supabase for authenticated users
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

        if (fetchError) throw fetchError;

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
        
        // Set the most recent session as active if none is set
        if (formattedSessions.length > 0 && !currentSessionId) {
          setCurrentSessionId(formattedSessions[0].id);
        }
      } else {
        // Load from localStorage for guest users
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
          
          setSessions(formattedSessions);
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
  }, [userId, currentSessionId, supabase]);

  const saveMessage = useCallback(async (message: Omit<ChatMessage, 'id' | 'createdAt'> & { metadata?: Record<string, any> }) => {
    if (!currentSessionId) return null;

    const newMessage: ChatMessage = {
      ...message,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      metadata: message.metadata || {}
    };
    console.log('Checking session:', { userId, currentSessionId });

    try {
      if (userId) {
        // First, ensure the session exists and belongs to the user
        const { data: session, error: sessionError } = await supabase
          .from('chat_sessions')
          .select('id, user_id')
          .eq('id', currentSessionId)
          .single();
  
        if (sessionError || !session) {
          console.log('Session not found, creating new session');
          // Create the session with the current user ID
          const { data: newSession, error: createError } = await supabase
            .from('chat_sessions')
            .insert([{ 
              id: currentSessionId,
              user_id: userId,
              title: 'New Chat',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }])
            .select()
            .single();
  
          if (createError) {
            console.error('Error creating session:', createError);
            throw createError;
          }
          console.log('Created new session:', newSession);
        } else if (session.user_id !== userId) {
          console.error('Session does not belong to user');
          throw new Error('Session does not belong to user');
        }
  
        // Now save the message
        console.log('Saving message to session:', currentSessionId);
        const { data, error } = await supabase
          .from('chat_messages')
          .insert([{
            session_id: currentSessionId,
            content: message.content,
            role: message.role,
            metadata: message.metadata || {},
            created_at: new Date().toISOString()
          }])
          .select()
          .single();
  
        if (error) {
          console.error('Error saving message:', error);
          throw error;
        }
  
        // Update local state
        setSessions(prevSessions => {
          const sessionExists = prevSessions.some(s => s.id === currentSessionId);
          if (sessionExists) {
            return prevSessions.map(session =>
              session.id === currentSessionId
                ? {
                    ...session,
                    updatedAt: new Date().toISOString(),
                    messages: [...(session.messages || []), newMessage]
                  }
                : session
            );
          } else {
            return [{
              id: currentSessionId,
              userId,
              title: 'New Chat',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              isActive: true,
              messages: [newMessage]
            }, ...prevSessions];
          }
        });
  
        return { ...newMessage, id: data.id };
      } else {
        // Save to localStorage for guest users
        const savedHistory = localStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
        const history: LocalChatSession[] = savedHistory ? JSON.parse(savedHistory) : [];
        
        const sessionIndex = history.findIndex(s => s.id === currentSessionId);
        
        if (sessionIndex >= 0) {
          history[sessionIndex] = {
            ...history[sessionIndex],
            updatedAt: new Date().toISOString(),
            messages: [
              ...history[sessionIndex].messages,
              {
                id: newMessage.id,
                content: newMessage.content,
                role: newMessage.role,
                timestamp: newMessage.createdAt,
                type: newMessage.metadata?.type as any
              }
            ]
          };
          
          localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(history));
        }

        // Update local state
        setSessions(prevSessions =>
          prevSessions.map(session =>
            session.id === currentSessionId
              ? {
                  ...session,
                  updatedAt: new Date().toISOString(),
                  messages: [...(session.messages || []), newMessage]                }
              : session
          )
        );

        return newMessage;
      }
    } catch (err) {
      console.error('Error saving message:', err);
      return null;
    }
  }, [currentSessionId, userId, supabase]);


  // Create a new chat session
  const createNewSession = useCallback(async (title: string = 'New Chat') => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      userId,
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
      messages: []
    };

    try {
      if (userId) {
        // Save to Supabase for authenticated users
        const { data, error } = await supabase
          .from('chat_sessions')
          .insert([{
            user_id: userId,
            title,
            is_active: true
          }])
          .select()
          .single();

        if (error) throw error;

        newSession.id = data.id;
      } else {
        // Save to localStorage for guest users
        const savedHistory = localStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
        const history: LocalChatSession[] = savedHistory ? JSON.parse(savedHistory) : [];
        
        const localSession: LocalChatSession = {
          id: newSession.id,
          title,
          createdAt: newSession.createdAt,
          updatedAt: newSession.updatedAt,
          messages: []
        };
        
        localStorage.setItem(
          CHAT_HISTORY_STORAGE_KEY, 
          JSON.stringify([localSession, ...history])
        );
      }

      // Update local state
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
      return newSession.id;
    } catch (err) {
      console.error('Error creating new session:', err);
      return null;
    }
  }, [userId, supabase]);

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

"use client";

import React, { useState, useEffect, useRef } from 'react';
import ChatInterface from '../../../components/chat-feature/ChatInterface';
import useChat from '../../../hooks/chat-feature/useChat';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { createSupabaseBrowserClient } from '../../../lib/supabase';
import { TopicTag } from '@/types/chat-feature';
import { useParams, useSearchParams } from 'next/navigation';


const ChatTeacherPage: React.FC = () => {
  const params = useParams();
  const sessionId = params && typeof params === 'object' && 'sessionId' in params ? params.sessionId as string : undefined;
  if (!sessionId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-lg">Invalid or missing session ID.</p>
      </div>
    );
  }

  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setUserId(user.id);
      } catch (error) {
        console.error('Error getting user:', error);
      } finally {
        setAuthChecked(true);
      }
    };
    getUser();
  }, [supabase]);

  const { messages, isLoading, error, sendMessage, learningPath, searchHistory, topicSuggestions, topicTags, selectedTags, startNewChat, isNewSession, expandMessage, expandingIds, sessions, currentSessionId, createNewSession, deleteSession, updateSessionTitle } = useChat(userId, sessionId); // Pass sessionId to useChat

  // Seed an opening message from a ?q= query param (used by the Learning Paths
  // "Learn" button, which deep-links here with the step topic). Send it exactly
  // once, after auth is resolved and the chat is initialised on an empty session.
  const searchParams = useSearchParams();
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || !authChecked) return;
    const q = searchParams?.get('q');
    if (q && messages.length === 0 && currentSessionId) {
      seededRef.current = true;
      sendMessage(q);
    }
  }, [authChecked, searchParams, messages.length, currentSessionId, sendMessage]);

  const handleTopicTagClick = (tag: TopicTag) => {
    // Logic for handling topic tag click
    console.log(`Topic tag clicked: ${tag.name}`);
  };

  const handleCustomPathCreated = (pathId: string) => {
    console.log('Custom path created:', pathId);
  };

  const retryLastMessage = () => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.sender === 'user') {
        sendMessage(lastMessage.text);
      } else if (messages.length > 1) {
        // If the last message was from AI, retry the user's message before it
        const userMessageBeforeLast = messages[messages.length - 2];
        if (userMessageBeforeLast.sender === 'user') {
          sendMessage(userMessageBeforeLast.text);
        }
      }
    }
  };

  if (!authChecked) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-lg">Loading…</p>
      </div>
    );
  }

  return (
    // The app shell adds a fixed header (pt-16 = 4rem) above this content and
    // keeps its menu sidebar. The chat page sizes itself to the space left
    // under that header and owns its own internal scroll (ChatInterface's
    // overflow-y-auto region). The sibling layout.tsx locks body overflow so
    // body never becomes a second scroll container.
    <div className="h-[calc(100dvh-4rem)] overflow-hidden flex flex-col bg-background text-foreground">
      <ChatInterface
        isNewSession={isNewSession}
        messages={messages}
        isLoading={isLoading}
        error={error}
        onSendMessage={sendMessage}
        onNewChat={createNewSession}
        learningPath={learningPath}
        searchHistory={searchHistory}
        topicSuggestions={topicSuggestions}
        topicTags={topicTags}
        selectedTags={selectedTags}
        onTopicTagClick={handleTopicTagClick}
        onCustomPathCreated={handleCustomPathCreated}
        onRetry={retryLastMessage}
        onExpandMessage={expandMessage}
        expandingIds={expandingIds}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onDeleteSession={deleteSession}
        onRenameSession={updateSessionTitle}
      />
    </div>
  );
};

export default ChatTeacherPage;

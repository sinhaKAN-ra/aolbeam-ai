"use client";

import React, { useState, useEffect } from 'react';
import ChatInterface from '../../../components/chat-feature/ChatInterface';
import useChat from '../../../hooks/chat-feature/useChat';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { createSupabaseBrowserClient } from '../../../lib/supabase';
import { TopicTag } from '@/types/chat-feature';
import { useParams } from 'next/navigation';

interface ChatPageProps {
  searchParams?: { [key: string]: string | string[] | undefined };
}

const ChatTeacherPage: React.FC<ChatPageProps> = () => {
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
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else if (error) {
        console.error('Error getting user:', error);
      }
    };
    getUser();
    getUser();
  }, [supabase]);

  const { messages, isLoading, error, sendMessage, learningPath, searchHistory, topicSuggestions, topicTags, selectedTags, startNewChat, isNewSession } = useChat(userId, sessionId); // Pass sessionId to useChat

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

  if (userId === null) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-lg">Loading user session...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-auto bg-background text-foreground">
      <div className="container mx-auto p-4 max-w-6xl flex-grow">
        <div className="bg-card rounded-lg h-auto flex flex-col">
          <ChatInterface
            isNewSession={isNewSession}
            messages={messages}
            isLoading={isLoading}
            error={error}
            onSendMessage={sendMessage}
            onNewChat={startNewChat}
            learningPath={learningPath}
            searchHistory={searchHistory}
            topicSuggestions={topicSuggestions}
            topicTags={topicTags}
            selectedTags={selectedTags}
            onTopicTagClick={handleTopicTagClick}
            onCustomPathCreated={handleCustomPathCreated}
            onRetry={retryLastMessage}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatTeacherPage;

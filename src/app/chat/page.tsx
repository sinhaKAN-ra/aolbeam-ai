"use client";

import React, { useState, useEffect } from 'react';
import ChatInterface from '../../components/chat-feature/ChatInterface';
import useChat from '../../hooks/chat-feature/useChat';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { createSupabaseBrowserClient } from '../../lib/supabase';
import { TopicTag } from '@/types/chat-feature';

const ChatTeacherPage: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    const getSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (data.session) {
        setUserId(data.session.user.id);
      } else if (error) {
        console.error('Error getting session:', error);
      }
    };
    getSession();
  }, [supabase]);

  const { messages, isLoading, error, sendMessage, learningPath, searchHistory, topicSuggestions, topicTags, selectedTags, startNewChat } = useChat(userId);

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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-primary">Explore Topics (Beta)</h1>
          <Button onClick={startNewChat} variant="outline" className="text-sm text-muted-foreground hover:text-foreground">
            New Chat
          </Button>
        </div>
        <div className="bg-card rounded-lg shadow-lg p-6 h-auto flex flex-col">
          <ChatInterface
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

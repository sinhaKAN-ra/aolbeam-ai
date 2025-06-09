import React from 'react';
import ChatInterface from './components/ChatInterface';
import { useChat } from './hooks/useChat';

function App() {
  const { messages, isLoading, learningPath, sendMessage } = useChat();

  return (
    <div className="min-h-screen bg-slate-50">
      <ChatInterface
        messages={messages}
        isLoading={isLoading}
        learningPath={learningPath}
        onSendMessage={sendMessage}
      />
    </div>
  );
}

export default App;
import React, { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient, ConversationalChatResult, ConversationMessage } from '../api/client';

export const Chat: React.FC = () => {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [currentResponse, setCurrentResponse] = useState<ConversationalChatResult | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentResponse]);

  const chatMutation = useMutation({
    mutationFn: async (text: string) => {
      const result = await apiClient.chat({
        message: text,
        conversationId: conversationId || undefined,
      });
      return result;
    },
    onSuccess: (data) => {
      if (!conversationId) {
        setConversationId(data.conversationId);
      }
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: message },
        { role: 'assistant', content: data.response },
      ]);
      setCurrentResponse(data);
      setMessage('');
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    chatMutation.mutate(message.trim());
  };

  const handleNewConversation = () => {
    setConversationId(null);
    setMessages([]);
    setCurrentResponse(null);
    setMessage('');
  };

  return (
    <div className="card flex flex-col h-full">
      <div className="card-header flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Conversational Chat</h3>
          {conversationId && (
            <p className="text-xs text-gray-500 mt-1">Conv ID: {conversationId.slice(0, 20)}...</p>
          )}
        </div>
        {conversationId && (
          <button onClick={handleNewConversation} className="btn-secondary text-sm">
            New Chat
          </button>
        )}
      </div>

      <div className="card-body flex-1 overflow-y-auto space-y-3 max-h-96">
        {messages.length === 0 && !currentResponse && (
          <p className="text-gray-500 text-center py-8">Start a new conversation...</p>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-900'
              }`}
            >
              <p className="text-sm break-words">{msg.content}</p>
            </div>
          </div>
        ))}

        {currentResponse && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2 text-sm">
            <p className="font-semibold text-yellow-900">Search Results:</p>
            <div className="space-y-1">
              <p className="text-xs text-gray-600">Type: {currentResponse.searchMetadata.searchType}</p>
              <p className="text-xs text-gray-600">
                Found {currentResponse.searchMetadata.resultCount} candidates in {currentResponse.searchMetadata.duration}ms
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-200 p-4">
        <form onSubmit={handleSendMessage} className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="input-field flex-1"
            />
            <button
              type="submit"
              disabled={chatMutation.isPending || !message.trim()}
              className="btn-primary"
            >
              {chatMutation.isPending ? '...' : 'Send'}
            </button>
          </div>
        </form>

        {chatMutation.error && (
          <p className="text-red-600 text-sm mt-2">
            Error: {(chatMutation.error as any)?.response?.data?.error || 'Request failed'}
          </p>
        )}
      </div>
    </div>
  );
};

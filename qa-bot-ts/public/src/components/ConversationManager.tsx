import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';

interface Conversation {
  id: string;
  messageCount: number;
}

export const ConversationManager: React.FC = () => {
  const [conversationId, setConversationId] = useState('');
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const historyQuery = useQuery({
    queryKey: ['history', selectedConv],
    queryFn: () => selectedConv ? apiClient.getChatHistory(selectedConv) : Promise.reject('No conversation selected'),
    enabled: !!selectedConv,
  });

  const deleteMutation = useMutation({
    mutationFn: (convId: string) => apiClient.deleteConversation(convId),
    onSuccess: () => {
      setConversations((prev) => prev.filter((c) => c.id !== selectedConv));
      setSelectedConv(null);
    },
  });

  const handleAddConversation = () => {
    if (!conversationId.trim()) return;
    if (!conversations.find((c) => c.id === conversationId)) {
      setConversations((prev) => [...prev, { id: conversationId, messageCount: 0 }]);
    }
    setConversationId('');
  };

  const handleSelectConversation = (convId: string) => {
    setSelectedConv(convId);
  };

  const handleDeleteConversation = () => {
    if (selectedConv) {
      deleteMutation.mutate(selectedConv);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-semibold">Conversation Manager</h3>
      </div>
      <div className="card-body space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={conversationId}
            onChange={(e) => setConversationId(e.target.value)}
            placeholder="Enter conversation ID"
            className="input-field flex-1"
          />
          <button onClick={handleAddConversation} className="btn-primary">
            Add
          </button>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 p-3 border-b border-gray-200">
            <p className="text-sm font-semibold">Conversations ({conversations.length})</p>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="p-3 text-sm text-gray-500">No conversations loaded</p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv.id)}
                  className={`p-3 border-b border-gray-100 cursor-pointer transition-colors ${
                    selectedConv === conv.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <p className="text-sm font-medium truncate">{conv.id.slice(0, 25)}...</p>
                  <p className="text-xs text-gray-500">{conv.messageCount} messages</p>
                </div>
              ))
            )}
          </div>
        </div>

        {selectedConv && (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900 truncate">Selected: {selectedConv}</p>
            </div>

            {historyQuery.isLoading && <p className="text-gray-500 text-sm">Loading history...</p>}

            {historyQuery.error && (
              <p className="text-red-600 text-sm">Failed to load history</p>
            )}

            {historyQuery.data && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                <p className="text-xs font-semibold text-gray-700">
                  Messages ({historyQuery.data.messageCount})
                </p>
                {historyQuery.data.messages.map((msg, idx) => (
                  <div key={idx} className="text-xs space-y-1">
                    <p className="font-semibold text-gray-600">
                      {msg.role === 'user' ? '👤 User' : '🤖 Assistant'}
                    </p>
                    <p className="text-gray-700 line-clamp-2">{msg.content}</p>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleDeleteConversation}
              disabled={deleteMutation.isPending}
              className="btn-danger w-full"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Conversation'}
            </button>
          </div>
        )}

        {deleteMutation.error && (
          <p className="text-red-600 text-sm">Failed to delete conversation</p>
        )}
      </div>
    </div>
  );
};

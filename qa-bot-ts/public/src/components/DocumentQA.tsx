import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient, DocumentQARequest } from '../api/client';

export const DocumentQA: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [documentText, setDocumentText] = useState('');
  const [promptType, setPromptType] = useState<'default' | 'detailed' | 'concise' | 'technical'>('detailed');
  const [response, setResponse] = useState('');

  const mutation = useMutation({
    mutationFn: (params: DocumentQARequest) => apiClient.qaDocument(params),
    onSuccess: (data) => setResponse(data.output),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !documentText.trim()) return;
    mutation.mutate({
      question: question.trim(),
      documentText: documentText.trim(),
      promptType,
    });
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-semibold">Document Q&A</h3>
      </div>
      <div className="card-body space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Question</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about the document..."
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Document Text</label>
            <textarea
              value={documentText}
              onChange={(e) => setDocumentText(e.target.value)}
              placeholder="Paste your document text here..."
              className="input-field h-32 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Response Type</label>
            <select
              value={promptType}
              onChange={(e) => setPromptType(e.target.value as any)}
              className="input-field"
            >
              <option value="default">Default</option>
              <option value="detailed">Detailed</option>
              <option value="concise">Concise</option>
              <option value="technical">Technical</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={mutation.isPending || !question.trim() || !documentText.trim()}
            className="btn-primary w-full"
          >
            {mutation.isPending ? 'Processing...' : 'Ask Question'}
          </button>
        </form>

        {mutation.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-700 text-sm">{(mutation.error as any)?.response?.data?.error || 'Request failed'}</p>
          </div>
        )}

        {response && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-blue-900">Response</h4>
            <p className="text-gray-700 whitespace-pre-wrap">{response}</p>
          </div>
        )}
      </div>
    </div>
  );
};

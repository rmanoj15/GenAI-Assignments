import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient, SearchRequest, SearchResponse } from '../api/client';

export const ResumeSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'keyword' | 'vector' | 'hybrid'>('hybrid');
  const [topK, setTopK] = useState(5);
  const [results, setResults] = useState<SearchResponse | null>(null);

  const mutation = useMutation({
    mutationFn: (params: SearchRequest) => apiClient.searchResumes(params),
    onSuccess: (data) => setResults(data),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    mutation.mutate({ query: query.trim(), searchType, topK });
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-semibold">Resume Search</h3>
      </div>
      <div className="card-body space-y-4">
        <form onSubmit={handleSearch} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Search Query</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., Python developer with AWS experience"
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Search Type</label>
              <select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value as any)}
                className="input-field"
              >
                <option value="keyword">Keyword</option>
                <option value="vector">Vector</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Top K Results</label>
              <input
                type="number"
                min={1}
                value={topK}
                onChange={(e) => setTopK(Math.max(1, parseInt(e.target.value) || 1))}
                className="input-field"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={mutation.isPending || !query.trim()}
            className="btn-primary w-full"
          >
            {mutation.isPending ? 'Searching...' : 'Search Resumes'}
          </button>
        </form>

        {mutation.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-700 text-sm">{(mutation.error as any)?.response?.data?.error || 'Search failed'}</p>
          </div>
        )}

        {results && (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Results ({results.resultCount})</h4>
              <span className="text-xs text-gray-500">{results.duration}ms</span>
            </div>

            {results.results.length === 0 ? (
              <p className="text-gray-500 text-sm">No results found</p>
            ) : (
              results.results.map((result, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{result.name}</p>
                      <p className="text-sm text-gray-600">{result.email}</p>
                    </div>
                    <span className="badge badge-success">{(result.score * 100).toFixed(1)}%</span>
                  </div>
                  <p className="text-xs text-gray-500">📞 {result.phoneNumber}</p>
                  <p className="text-sm text-gray-700 line-clamp-2">{result.content}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

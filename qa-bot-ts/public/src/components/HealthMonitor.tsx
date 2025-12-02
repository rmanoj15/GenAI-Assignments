import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export const HealthMonitor: React.FC = () => {
  const { data: health, isLoading, error } = useQuery({
    queryKey: ['health'],
    queryFn: () => apiClient.health(),
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold">System Health</h3>
        </div>
        <div className="card-body">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card border-red-200">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-red-700">System Health</h3>
        </div>
        <div className="card-body">
          <p className="text-red-600">Failed to connect to backend</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-semibold">System Health</h3>
      </div>
      <div className="card-body space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <p className="text-lg font-semibold">
              <span className="badge badge-success">{health?.status}</span>
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Model</p>
            <p className="text-lg font-semibold">{health?.model.provider} / {health?.model.model}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Pipeline</p>
            <p className="text-lg">
              <span className={`badge ${health?.retrievalPipeline === 'ready' ? 'badge-success' : 'badge-warning'}`}>
                {health?.retrievalPipeline}
              </span>
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Active Conversations</p>
            <p className="text-lg font-semibold">{health?.activeConversations}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Temperature</p>
            <p className="text-lg font-semibold">{health?.model.temperature}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Last Updated</p>
            <p className="text-sm text-gray-500">{new Date(health?.timestamp || '').toLocaleTimeString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

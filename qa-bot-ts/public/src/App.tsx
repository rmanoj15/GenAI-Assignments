import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HealthMonitor } from './components/HealthMonitor';
import { ResumeSearch } from './components/ResumeSearch';
import { DocumentQA } from './components/DocumentQA';
import { Chat } from './components/Chat';
import { ConversationManager } from './components/ConversationManager';
import './styles/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const [activeTab, setActiveTab] = React.useState<'health' | 'search' | 'qa' | 'chat' | 'manager'>('health');

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold text-gray-900">QA Bot Dashboard</h1>
            <p className="text-gray-600 mt-1">Interact with all backend APIs</p>
          </div>
        </header>

        {/* Navigation */}
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex gap-1">
              {[
                { id: 'health', label: '🏥 Health' },
                { id: 'search', label: '🔍 Resume Search' },
                { id: 'qa', label: '❓ Document QA' },
                { id: 'chat', label: '💬 Chat' },
                { id: 'manager', label: '📋 Conversations' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-8">
          {activeTab === 'health' && <HealthMonitor />}
          {activeTab === 'search' && <ResumeSearch />}
          {activeTab === 'qa' && <DocumentQA />}
          {activeTab === 'chat' && <Chat />}
          {activeTab === 'manager' && <ConversationManager />}
        </main>

        {/* Footer */}
        <footer className="bg-gray-50 border-t border-gray-200 mt-12">
          <div className="max-w-7xl mx-auto px-4 py-6 text-center text-gray-600 text-sm">
            <p>QA Bot Frontend • All endpoints integrated • TypeScript + React + Tailwind CSS</p>
          </div>
        </footer>
      </div>
    </QueryClientProvider>
  );
}

export default App;

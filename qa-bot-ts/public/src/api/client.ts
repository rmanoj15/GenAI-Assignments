import axios, { AxiosInstance } from 'axios';

// Type definitions matching backend
export interface HealthResponse {
  status: string;
  timestamp: string;
  model: {
    provider: string;
    model: string;
    temperature: number;
  };
  retrievalPipeline: string;
  activeConversations: number;
}

export interface SearchRequest {
  query: string;
  searchType: 'keyword' | 'vector' | 'hybrid';
  topK?: number;
}

export interface SearchResult {
  name: string;
  email: string;
  phoneNumber: string;
  content: string;
  score: number;
  matchType: string;
}

export interface SearchResponse {
  query: string;
  searchType: string;
  topK: number;
  resultCount: number;
  duration: number;
  results: SearchResult[];
  metadata: {
    traceId: string;
    hybridWeights?: {
      vector: number;
      keyword: number;
    };
  };
}

export interface DocumentQARequest {
  question: string;
  documentPath?: string;
  documentText?: string;
  promptType?: 'default' | 'detailed' | 'concise' | 'technical';
}

export interface DocumentQAResponse {
  output: string;
  model: string;
  provider: string;
  promptType: string;
}

export interface ConversationalChatRequest {
  message: string;
  conversationId?: string;
  includeHistory?: boolean;
  topK?: number;
}

export interface SearchMetadata {
  query: string;
  searchType: string;
  resultCount: number;
  duration: number;
}

export interface ConversationalChatResult {
  response: string;
  conversationId: string;
  messageCount: number;
  model: string;
  provider: string;
  searchResults: SearchResult[];
  searchMetadata: SearchMetadata;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ConversationHistoryResult {
  conversationId: string;
  messages: ConversationMessage[];
  messageCount: number;
}

export interface ErrorResponse {
  error: string;
  details?: string;
  timestamp?: string;
}

class APIClient {
  private client: AxiosInstance;

  constructor(baseURL: string = '/api') {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add error interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  async health(): Promise<HealthResponse> {
    const response = await this.client.get<HealthResponse>('/health');
    return response.data;
  }

  async searchResumes(params: SearchRequest): Promise<SearchResponse> {
    const response = await this.client.post<SearchResponse>('/search/resumes', params);
    return response.data;
  }

  async qaDocument(params: DocumentQARequest): Promise<DocumentQAResponse> {
    const response = await this.client.post<DocumentQAResponse>('/search/document', params);
    return response.data;
  }

  async chat(params: ConversationalChatRequest): Promise<ConversationalChatResult> {
    const response = await this.client.post<ConversationalChatResult>('/chat', params);
    return response.data;
  }

  async getChatHistory(conversationId: string): Promise<ConversationHistoryResult> {
    const response = await this.client.post<ConversationHistoryResult>('/chat/history', {
      conversationId,
    });
    return response.data;
  }

  async deleteConversation(conversationId: string): Promise<{ success: boolean; message: string }> {
    const response = await this.client.delete(`/chat/${conversationId}`);
    return response.data;
  }
}

export const apiClient = new APIClient();

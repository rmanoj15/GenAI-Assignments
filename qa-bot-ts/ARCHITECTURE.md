# Frontend Architecture Diagram

## Project Structure

```
qa-bot-ts/
├── src/                                  [BACKEND]
│   ├── server.ts                         ← Express server with CORS ✅
│   ├── lib/
│   │   ├── conversationalRAGChain.ts     ← Chat logic
│   │   ├── memory/
│   │   │   └── chatMemory.ts             ← Memory store
│   │   └── models/
│   │       └── factory.ts                ← Model creation
│   └── pipelines/
│       └── retrieval/
│           ├── hybridSearch.ts           ← Search logic
│           └── pipeline.ts               ← Search pipeline
│
├── public/                               [FRONTEND]
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts                 ← Typed API client (6 endpoints) ✅
│   │   │
│   │   ├── components/
│   │   │   ├── HealthMonitor.tsx         ← System status dashboard ✅
│   │   │   ├── ResumeSearch.tsx          ← Resume search UI ✅
│   │   │   ├── DocumentQA.tsx            ← Document Q&A UI ✅
│   │   │   ├── Chat.tsx                  ← Chat UI ✅
│   │   │   └── ConversationManager.tsx   ← History & management ✅
│   │   │
│   │   ├── styles/
│   │   │   └── index.css                 ← Tailwind CSS styling ✅
│   │   │
│   │   ├── App.tsx                       ← Main app (tab navigation) ✅
│   │   └── main.tsx                      ← React entry point ✅
│   │
│   ├── index.html                        ← HTML template ✅
│   ├── package.json                      ← Frontend deps ✅
│   ├── tsconfig.json                     ← TypeScript config ✅
│   ├── vite.config.ts                    ← Vite dev server ✅
│   ├── tailwind.config.js                ← Tailwind config ✅
│   ├── postcss.config.js                 ← PostCSS config ✅
│   ├── .gitignore                        ← Git rules ✅
│   ├── README.md                         ← Frontend docs ✅
│   └── dist/                             ← Production build (252 KB) ✅
│
├── README.md                             ← Main project README ✅
├── FULLSTACK_SETUP.md                    ← Setup guide ✅
├── FRONTEND_IMPLEMENTATION.md            ← Implementation details ✅
├── QUICK_START.md                        ← Quick start ✅
└── IMPLEMENTATION_SUMMARY.txt            ← Summary ✅
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      App.tsx                                │
│          (Main app with tab navigation)                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
├─ Tab 1: HealthMonitor.tsx ──► useQuery /health            │
│          ├─ System status                                   │
│          ├─ Model info                                      │
│          ├─ Pipeline status                                 │
│          └─ Auto-refresh (5s)                               │
│                                                             │
├─ Tab 2: ResumeSearch.tsx ──► useMutation /search/resumes   │
│          ├─ Query input                                     │
│          ├─ Search type selector                            │
│          ├─ topK slider                                     │
│          └─ Results display                                 │
│                                                             │
├─ Tab 3: DocumentQA.tsx ──► useMutation /search/document    │
│          ├─ Question input                                  │
│          ├─ Document text area                              │
│          ├─ Response type selector                          │
│          └─ Answer display                                  │
│                                                             │
├─ Tab 4: Chat.tsx ──► useMutation /chat                     │
│          ├─ Message input                                   │
│          ├─ Conversation ID management                      │
│          ├─ Message history                                 │
│          ├─ Search results display                          │
│          └─ Auto-scroll to latest                           │
│                                                             │
└─ Tab 5: ConversationManager.tsx ─────────────────────────  │
           ├─ useQuery /chat/history                          │
           ├─ Conversation list                               │
           ├─ Message browser                                 │
           └─ useMutation DELETE /chat/:id                    │
└─────────────────────────────────────────────────────────────┘
```

## API Integration Flow

```
Frontend (React)
│
├─ client.ts (API Client)
│  │
│  ├─ apiClient.health()
│  │  └─► GET /health
│  │      └─► HealthResponse
│  │
│  ├─ apiClient.searchResumes()
│  │  └─► POST /search/resumes
│  │      └─► SearchResponse
│  │
│  ├─ apiClient.qaDocument()
│  │  └─► POST /search/document
│  │      └─► DocumentQAResponse
│  │
│  ├─ apiClient.chat()
│  │  └─► POST /chat
│  │      └─► ConversationalChatResult
│  │
│  ├─ apiClient.getChatHistory()
│  │  └─► POST /chat/history
│  │      └─► ConversationHistoryResult
│  │
│  └─ apiClient.deleteConversation()
│     └─► DELETE /chat/:id
│         └─► { success: true }
│
└─ Components (React)
   │
   ├─ useQuery (for GET requests)
   │  └─ Auto-refetch on mount
   │
   └─ useMutation (for POST/DELETE)
      └─ Manual trigger, error handling
```

## Data Flow Example: Chat

```
User Types Message
│
└─► Chat.tsx
    │
    ├─ Capture input
    │
    ├─ useMutation.mutate()
    │  │
    │  └─► apiClient.chat({
    │      message: "Find Python developers",
    │      conversationId: "conv_123"
    │    })
    │
    └─► axios POST /api/chat
        │
        └─ Backend (server.ts)
           │
           ├─ ConversationalRAGChainManager
           │  │
           │  ├─ ConversationalFilter (if follow-up)
           │  │
           │  └─ RetrievalPipeline
           │     ├─ Keyword search
           │     ├─ Vector search
           │     └─ LLM reranking
           │
           └─► Returns ConversationalChatResult
               │
               ├─ response: "Found 5 developers..."
               ├─ searchResults: [...]
               └─ conversationId: "conv_123"

Result Received
│
└─► Chat.tsx
    │
    ├─ Display message (user + assistant)
    ├─ Show search results
    ├─ Cache results for filtering
    └─ Scroll to latest message
```

## Type Safety Flow

```
Backend (Types defined)
│
├─ src/types/api.ts
│  ├─ SearchRequest
│  ├─ SearchResponse
│  ├─ ConversationalQueryBody
│  ├─ ConversationalChatResult
│  └─ ... (all types)
│
└─ src/server.ts
   ├─ Route handlers use Zod validation
   └─ Send typed responses

Frontend (Types imported)
│
├─ public/src/api/client.ts
│  ├─ Re-export types from backend
│  ├─ Axios requests use types
│  └─ Response types are strict
│
└─ public/src/components/*.tsx
   ├─ Components receive typed props
   ├─ useMutation<ResponseType>()
   ├─ useQuery<ResponseType>()
   └─ 100% type safety guaranteed
```

## Component Props & State Flow

```
App.tsx (Global State)
│
├─ activeTab: 'health' | 'search' | 'qa' | 'chat' | 'manager'
│
└─ Pass children based on activeTab
   │
   ├─ HealthMonitor
   │  ├─ useQuery: HealthResponse
   │  └─ Local state: none
   │
   ├─ ResumeSearch
   │  ├─ Local state: query, searchType, topK
   │  ├─ useMutation: SearchResponse
   │  └─ Local state: results
   │
   ├─ DocumentQA
   │  ├─ Local state: question, documentText, promptType
   │  ├─ useMutation: DocumentQAResponse
   │  └─ Local state: response
   │
   ├─ Chat
   │  ├─ Local state: conversationId, message, messages
   │  ├─ useRef: messagesEndRef
   │  ├─ useMutation: ConversationalChatResult
   │  └─ useEffect: auto-scroll
   │
   └─ ConversationManager
      ├─ Local state: conversationId, selectedConv, conversations
      ├─ useQuery: ConversationHistoryResult
      └─ useMutation: deleteConversation
```

## Styling Architecture

```
Tailwind CSS + Custom Utilities
│
├─ Base Styles
│  ├─ Global HTML/body reset
│  ├─ Font & color defaults
│  └─ Box sizing
│
├─ Custom Components (CSS classes)
│  ├─ .btn, .btn-primary, .btn-secondary, .btn-danger
│  ├─ .card, .card-header, .card-body
│  ├─ .input-field
│  ├─ .badge, .badge-success, .badge-warning, .badge-error
│  └─ Built on top of Tailwind utilities
│
└─ Component Usage (via className)
   ├─ className="card" ──► @apply bg-white border...
   ├─ className="btn-primary" ──► @apply btn bg-blue-600...
   ├─ className="input-field" ──► @apply w-full px-3...
   └─ Inline Tailwind utilities
```

## Build & Deployment Pipeline

```
Development
│
├─ npm run dev (root)
│  ├─ tsx watch src/server.ts
│  └─ Backend at :8787
│
└─ cd public && npm run dev
   ├─ vite dev server
   ├─ Proxy to :8787
   └─ Frontend at :5173

Production
│
├─ npm run build (root)
│  ├─ tsc -p tsconfig.json
│  └─ Compiled to dist/
│
├─ cd public && npm run build
│  ├─ tsc -b
│  ├─ vite build
│  └─ Optimized to dist/
│
└─ npm start (root)
   ├─ Serve backend from dist/
   └─ Can serve frontend from static folder

Deployment Options
│
├─ Single Server
│  ├─ Build everything
│  ├─ Serve frontend as static
│  └─ Run backend on same server
│
├─ Separate Frontend/Backend
│  ├─ Frontend → Vercel/Netlify
│  ├─ Backend → Heroku/Railway
│  └─ Update API base URL
│
└─ Docker
   ├─ Build both in image
   ├─ Expose ports
   └─ Single command deploy
```

---

**All 20+ frontend files created and integrated with the 6 backend APIs. Ready for development and production! 🎉**

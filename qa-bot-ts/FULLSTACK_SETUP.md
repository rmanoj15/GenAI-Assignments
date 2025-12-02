# QA Bot - Full Stack Setup & Usage Guide

This project now includes both a **backend API** (Node.js/Express/TypeScript) and a **frontend dashboard** (React/Vite/Tailwind CSS).

## 📦 Project Structure

```
qa-bot-ts/
├── src/                          # Backend TypeScript source
│   ├── server.ts                 # Express API server
│   ├── lib/                      # Core business logic
│   ├── pipelines/                # Search & ingestion pipelines
│   └── ...
├── public/                       # Frontend React app
│   ├── src/
│   │   ├── components/           # React components
│   │   ├── api/                  # API client
│   │   ├── styles/               # Tailwind CSS
│   │   └── App.tsx               # Main app
│   ├── package.json              # Frontend dependencies
│   └── vite.config.ts            # Vite dev server config
├── package.json                  # Backend dependencies
└── README.md                      # Main README
```

## 🚀 Quick Start (Both Frontend & Backend)

### Option 1: Run in Separate Terminals (Recommended for Development)

**Terminal 1 - Backend:**
```bash
npm install                  # Install backend dependencies (root)
npm run dev                  # Starts at http://localhost:8787
```

**Terminal 2 - Frontend:**
```bash
cd public                    # Navigate to frontend folder
npm install                  # Install frontend dependencies (if not done)
npm run dev                  # Starts at http://localhost:5173
```

Then open **http://localhost:5173** in your browser.

### Option 2: Run Both with npm Workspaces (One Command)

The project is set up to support npm workspaces, but they're kept separate for simplicity.

## 🎯 Frontend Features

Once the frontend is running at `http://localhost:5173`, you have access to:

### 1. **Health Monitor** 🏥
- Real-time system status
- Active model info (provider, model name, temperature)
- Retrieval pipeline status
- Active conversation count
- Auto-refreshes every 5 seconds

### 2. **Resume Search** 🔍
- Search through resumes using three strategies:
  - **Keyword Search** - BM25-based full-text search
  - **Vector Search** - Semantic similarity using embeddings
  - **Hybrid Search** - Combines both with configurable weights
- Adjust `topK` to get more/fewer results
- View match scores and detailed candidate info

### 3. **Document Q&A** ❓
- Ask questions about any document text
- Supports multiple response types:
  - **Default** - Standard answer
  - **Detailed** - Comprehensive explanation
  - **Concise** - Quick summary
  - **Technical** - Developer-focused response
- Paste document text directly into the UI

### 4. **Conversational Chat** 💬
- Multi-turn conversations with memory
- Each conversation gets a unique ID (stored in URL)
- System automatically searches for relevant resumes
- Supports result filtering based on follow-up questions
- View search results and metadata for each response

### 5. **Conversation Manager** 📋
- View all active conversation IDs
- Load previous conversations by ID
- Browse full message history (user + assistant)
- Delete conversations to free up memory

## 🔧 Configuration

### Backend (.env file)
Located at the project root. Key variables:

```env
# Model provider
MODEL_PROVIDER=groq                    # or: openai, anthropic
TEMPERATURE=0.2

# API Keys
GROQ_API_KEY=...
OPENAI_API_KEY=...
MISTRALAI_API_KEY=...

# MongoDB
MONGODB_URI=...
MONGODB_DB_NAME=db_resumes
MONGODB_COLLECTION=resumes

# Embeddings
EMBEDDING_PROVIDER=mistral
EMBEDDING_MODEL=mistral-embed

# Hybrid Search Weights
HYBRID_VECTOR_WEIGHT=0.2
HYBRID_KEYWORD_WEIGHT=0.8

# Server
SERVER_URL=http://localhost:8787
```

### Frontend (vite.config.ts)
Located in `public/vite.config.ts`. Proxy configuration:

```typescript
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:8787',   // Backend URL
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, '')
    }
  }
}
```

To change frontend port, edit `port: 5173` in the config.

## 📝 Building for Production

### Backend Build
```bash
npm run build          # Compiles TypeScript to dist/
npm run start          # Runs production build
```

### Frontend Build
```bash
cd public
npm run build          # Creates optimized dist/ folder
npm run preview        # Preview the production build locally
```

### Serving Frontend from Backend

To serve the React app from the same Express server:

1. Build frontend: `cd public && npm run build`
2. Copy the `public/dist` folder contents to a static folder (e.g., `src/public`)
3. Add middleware to `src/server.ts`:

```typescript
app.use(express.static('dist'));
app.get('*', (req, res) => {
  res.sendFile('dist/index.html');
});
```

4. Run backend: `npm run start` 
5. Access frontend at `http://localhost:8787`

## 🧪 Testing APIs Manually

### Using curl:

```bash
# Health check
curl http://localhost:8787/health

# Search resumes
curl -X POST http://localhost:8787/search/resumes \
  -H "Content-Type: application/json" \
  -d '{"query":"Python developer","searchType":"hybrid","topK":5}'

# Chat
curl -X POST http://localhost:8787/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Find senior engineers"}'

# Document QA
curl -X POST http://localhost:8787/search/document \
  -H "Content-Type: application/json" \
  -d '{"question":"What is this?","documentText":"Some text..."}'
```

### Using frontend UI:
All endpoints are available through the dashboard tabs. No curl needed!

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| **Frontend blank page** | Check browser console (F12) for errors. Ensure backend is running at `http://localhost:8787` |
| **"Cannot connect to backend"** | Start backend first: `npm run dev` in root folder. Check firewall. |
| **CORS errors** | Backend has CORS enabled. If frontend on different origin, update `vite.config.ts` proxy. |
| **"Cannot find module" in backend** | Run `npm install` in root. Check Node version >= 18.17. |
| **Vite dev server not starting** | Port 5173 may be in use. Change in `public/vite.config.ts` line 7. |
| **TypeScript errors in frontend** | Run `cd public && npm run build` to see full errors. |

## 📚 File Structure Deep Dive

### Backend Key Files
- **`src/server.ts`** - Express app with all route handlers + CORS
- **`src/config/index.ts`** - Environment & configuration management
- **`src/lib/conversationalRAGChain.ts`** - Multi-turn chat logic
- **`src/pipelines/retrieval/pipeline.ts`** - Search pipeline (hybrid, keyword, vector)
- **`src/lib/memory/chatMemory.ts`** - Conversation memory store

### Frontend Key Files
- **`public/src/api/client.ts`** - Typed API client for all endpoints
- **`public/src/App.tsx`** - Main app with tab navigation
- **`public/src/components/Chat.tsx`** - Conversational interface
- **`public/vite.config.ts`** - Dev server & proxy config
- **`public/tailwind.config.js`** - Styling configuration

## 🚢 Deployment Options

### 1. **Heroku / Railway / Render**
```bash
npm run build
npm start
```

### 2. **Docker**
Create `Dockerfile` in root:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
RUN cd public && npm install && npm run build
CMD ["npm", "start"]
```

### 3. **Vercel (Frontend Only)**
```bash
cd public
vercel deploy
```
Set backend API URL in environment variables.

### 4. **Static Hosting + Separate Backend**
- Frontend: Deploy `public/dist` to Netlify/Vercel
- Backend: Deploy to Heroku/Railway/AWS
- Update frontend API endpoint in environment

## 📖 Additional Resources

- [Backend README](./README.md)
- [Frontend README](./public/README.md)
- [Vite Docs](https://vitejs.dev/)
- [React Docs](https://react.dev/)
- [Tailwind CSS Docs](https://tailwindcss.com/)

## 🎓 Next Steps

1. ✅ Run frontend & backend locally
2. ✅ Test all 5 features in the dashboard
3. ✅ Try different search types and prompt types
4. 📊 Add charts/analytics for search results
5. 🔐 Add authentication (optional)
6. 🐳 Containerize with Docker for deployment

---

**Happy coding!** 🚀

For issues or questions, check the README files or review the component code in `public/src/components/`.

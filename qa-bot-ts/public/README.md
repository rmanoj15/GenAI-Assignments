# QA Bot Frontend

A React + TypeScript frontend dashboard for the QA Bot API, built with Vite and Tailwind CSS.

## Features

✅ **Health Monitor** - Real-time system status, model info, and active conversations  
✅ **Resume Search** - Keyword, vector, and hybrid search with configurable top-K results  
✅ **Document Q&A** - Ask questions on document text with multiple response types  
✅ **Conversational Chat** - Maintain multi-turn conversations with memory and cached results  
✅ **Conversation Manager** - Load, view, and delete conversation histories  

## Quick Start

### Install dependencies
```bash
npm install
```

### Development
```bash
npm run dev
```
Starts the Vite dev server at `http://localhost:5173` with proxy to backend at `http://localhost:8787`.

### Build for production
```bash
npm run build
```
Creates optimized bundle in `dist/` folder.

### Preview production build
```bash
npm run preview
```

## Architecture

- **State Management**: TanStack Query (React Query) for server state + local React state
- **HTTP Client**: Axios with TypeScript types and error handling
- **Styling**: Tailwind CSS with custom utility classes
- **Components**:
  - `HealthMonitor.tsx` - System status dashboard
  - `ResumeSearch.tsx` - Resume/candidate search interface
  - `DocumentQA.tsx` - Single-document Q&A
  - `Chat.tsx` - Conversational chat with multi-turn memory
  - `ConversationManager.tsx` - Conversation history browser and management
  - `App.tsx` - Main app with tab navigation
- **API Client**: `src/api/client.ts` - Fully typed API client with all 6 endpoints

## API Integration

The frontend communicates with the backend on `http://localhost:8787` (configurable via `vite.config.ts`).

**Endpoints integrated:**
- `GET /health` - Health check
- `POST /search/resumes` - Resume search (keyword/vector/hybrid)
- `POST /search/document` - Document Q&A
- `POST /chat` - Conversational chat with RAG
- `POST /chat/history` - Retrieve conversation history
- `DELETE /chat/:conversationId` - Delete conversation

## Environment

- **Node.js**: 18.17+
- **npm**: 8+
- **Backend**: Requires backend running at `http://localhost:8787`

## Development Tips

1. **CORS Issues?** - The backend has CORS middleware enabled. If frontend on different origin, update the proxy in `vite.config.ts`.
2. **API Base URL** - Change via the `APIClient` constructor in `src/api/client.ts` or update `vite.config.ts` proxy.
3. **Type Safety** - All API responses are fully typed. Add new types in `src/api/client.ts` as backend changes.
4. **Component Reuse** - All components are self-contained. Reuse the `Chat.tsx` component in other apps by extracting its logic.

## Deployment

- **Static Hosting**: Build with `npm run build` and deploy `dist/` folder to any static host (Vercel, Netlify, etc.)
- **Serve from Backend**: Copy `dist/` contents to a static folder served by the backend Express app
- **Docker**: Add a Dockerfile to containerize the frontend alongside the backend

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Cannot find module" errors | Run `npm install` and check `tsconfig.json` |
| CORS errors | Check backend has CORS middleware enabled; update `vite.config.ts` proxy |
| API timeouts | Ensure backend is running at `http://localhost:8787` |
| Blank page | Check browser console for errors; verify Vite built successfully |

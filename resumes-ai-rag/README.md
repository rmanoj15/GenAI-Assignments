# resumes-ai-rag

Enterprise-grade Resume Search RAG service using Node.js, Express, MongoDB, Mistral (embeddings), and Groq (LLM). Implements BM25 + vector search with LLM reranking and summarization.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create an `env` or `.env` file with:
```bash
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/?appName=Cluster0
MONGODB_DB=db_resumes
MONGODB_COLLECTION=resumes
MONGODB_BM25_INDEX=BM25_index
MONGODB_VECTOR_INDEX=resume_vector_index
MISTRAL_API_KEY=your_mistral_key
GROQ_API_KEY=your_groq_key
EMBEDDING_MODEL=mistral-embed
LLM_MODEL=llama-3.3-70b-versatile
LOG_LEVEL=info
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Build and Run Production
```bash
npm run build
npm start
```

---

## Architecture

- **Embedding Service**: On-demand query embeddings via Mistral API
- **Search Service**: BM25 + Vector Search via MongoDB Atlas
- **LLM Service**: Reranking & summarization via Groq
- **Pipeline**: Synchronous orchestration with fallbacks

---

## API Endpoints

### Health & Status

#### **GET /v1/health**
Application health check with uptime and version info.

**Response:**
```json
{
  "app": "resumes-ai-rag",
  "version": "0.1.0",
  "uptimeSeconds": 24.861940723,
  "env": "development",
  "requestId": "ecebaa1f-2ed9-4c4a-962b-6650a0144d55"
}
```

---

#### **GET /v1/health/db**
MongoDB connectivity check with latency.

**Response:**
```json
{
  "status": "ok",
  "db": "db_resumes",
  "latencyMs": 15,
  "requestId": "..."
}
```

---

### Embeddings

#### **POST /v1/embeddings**
Generate vector embeddings for text using Mistral API.

**Request:**
```json
{
  "input": "Senior Node.js backend engineer with MongoDB experience",
  "model": "mistral-embed"
}
```

**Response:**
```json
{
  "embedding": [0.012, -0.045, 0.089, ...],
  "model": "mistral-embed",
  "dimension": 1024,
  "timings": {
    "embeddingMs": 245
  },
  "requestId": "..."
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{"input":"Senior Node.js engineer"}'
```

---

### Search Endpoints

#### **POST /v1/search/bm25**
Full-text BM25 search across resume text, skills, roles, and experience.

**Request:**
```json
{
  "query": "senior node.js backend engineer",
  "topK": 20,
  "filters": {
    "minYearsExperience": 5,
    "location": "India"
  }
}
```

**Response:**
```json
{
  "requestId": "...",
  "query": "senior node.js backend engineer",
  "topK": 20,
  "timings": {
    "bm25Ms": 45,
    "totalMs": 50
  },
  "results": [
    {
      "_id": "6921b25c14018fa7b06fcaf3",
      "name": "Ranjani M",
      "email": "ranjani6@gmail.com",
      "role": "Backend Developer & API-Automation Tester",
      "location": "India",
      "skills": "[\"Node JS\", \"Express JS\", \"MongoDB\", ...]",
      "total_Experience": 2.5,
      "relevant_Experience": 2.5,
      "score": 4.204,
      "snippet": "RANJANI M BackendDeveloper| API and Automation Tester..."
    }
  ]
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/v1/search/bm25 \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Node.js backend engineer",
    "topK": 10
  }'
```

---

#### **POST /v1/search/vector**
Semantic vector search using embeddings and MongoDB Atlas Vector Search.

**Request:**
```json
{
  "query": "full-stack engineer with React and Node.js",
  "topK": 15,
  "filters": {
    "minYearsExperience": 3
  }
}
```

**Response:**
```json
{
  "requestId": "...",
  "query": "full-stack engineer with React and Node.js",
  "topK": 15,
  "timings": {
    "embeddingMs": 189,
    "vectorMs": 52,
    "totalMs": 241
  },
  "results": [
    {
      "_id": "...",
      "name": "...",
      "score": 0.812,
      "snippet": "..."
    }
  ]
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/v1/search/vector \
  -H "Content-Type: application/json" \
  -d '{
    "query": "React Node.js full-stack",
    "topK": 10
  }'
```

---

#### **POST /v1/search/hybrid**
Run BM25 and vector search in parallel, return both ranked lists independently.

**Request:**
```json
{
  "query": "senior backend engineer",
  "topK": 10,
  "filters": {}
}
```

**Response:**
```json
{
  "requestId": "...",
  "query": "senior backend engineer",
  "topK": 10,
  "timings": {
    "totalMs": 245
  },
  "result": {
    "bm25": {
      "results": [...],
      "timings": {
        "bm25Ms": 42
      }
    },
    "vector": {
      "results": [...],
      "timings": {
        "embeddingMs": 180,
        "vectorMs": 23
      }
    }
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/v1/search/hybrid \
  -H "Content-Type: application/json" \
  -d '{
    "query": "senior backend engineer",
    "topK": 10
  }'
```

---

### LLM Operations

#### **POST /v1/search/rerank**
Re-rank candidates using LLM for final relevance scoring.

**Request:**
```json
{
  "query": "Senior Node.js backend engineer with MongoDB experience",
  "candidates": [
    {
      "resumeId": "resume-123",
      "snippet": "Backend engineer with 10 years Node.js experience"
    },
    {
      "resumeId": "resume-456",
      "snippet": "Frontend developer using React and Vue.js"
    }
  ],
  "topK": 1
}
```

**Response:**
```json
{
  "requestId": "...",
  "query": "Senior Node.js backend engineer with MongoDB experience",
  "candidateId": "...",
  "ranked": [
    {
      "resumeId": "resume-123",
      "rank": 1,
      "score": 0.95,
      "reasoning": "Excellent match: 10 years Node.js experience directly aligns with senior-level requirement"
    },
    {
      "resumeId": "resume-456",
      "rank": 2,
      "score": 0.45,
      "reasoning": "Limited backend experience; primarily focused on frontend technologies"
    }
  ],
  "meta": {
    "model": "llama-3.3-70b-versatile"
  },
  "timings": {
    "rerankMs": 410
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/v1/search/rerank \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Senior Node.js engineer",
    "candidates": [
      {
        "resumeId": "1",
        "snippet": "Backend engineer with 10 years Node.js"
      },
      {
        "resumeId": "2",
        "snippet": "Frontend developer using React"
      }
    ],
    "topK": 2
  }'
```

---

#### **POST /v1/search/summarize**
Generate concise fit assessment for a candidate resume.

**Request:**
```json
{
  "query": "Senior backend engineer with MongoDB experience",
  "candidate": {
    "resumeId": "resume-123",
    "snippet": "Backend engineer with 8 years experience in Node.js, Express, MongoDB..."
  },
  "style": "short",
  "maxTokens": 200
}
```

**Response:**
```json
{
  "requestId": "...",
  "query": "Senior backend engineer with MongoDB experience",
  "candidateId": "resume-123",
  "summary": "Strong fit: Candidate has 8 years backend engineering experience with Node.js and MongoDB. Well-aligned with senior-level requirements and specific technology stack.",
  "meta": {
    "model": "llama-3.3-70b-versatile",
    "style": "short"
  },
  "timings": {
    "summarizeMs": 410
  }
}
```

**Parameters:**
- `style`: `"short"` (2-3 sentences) or `"detailed"` (4-6 sentences)
- `maxTokens`: 50-4000 (default 300)

**Example:**
```bash
curl -X POST http://localhost:3000/v1/search/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Senior Node.js engineer",
    "candidate": {
      "resumeId": "1",
      "snippet": "Backend engineer with 10 years Node.js experience"
    },
    "style": "short",
    "maxTokens": 200
  }'
```

---

### End-to-End Pipeline

#### **POST /v1/search**
Complete resume search pipeline: embeddings → BM25 → vector → hybrid merge → rerank → optional summarization.

**Request:**
```json
{
  "query": "Senior Node.js backend engineer with MongoDB",
  "topK": 20,
  "rerankTopK": 10,
  "rerank": true,
  "summarize": false,
  "summarizeStyle": "short",
  "maxSummarizeTokens": 300,
  "filters": {
    "minYearsExperience": 5
  }
}
```

**Response:**
```json
{
  "requestId": "ac3781f0-028a-495a-9785-bb32820af315",
  "query": "Senior Node.js backend engineer with MongoDB",
  "candidatesCount": 3,
  "candidates": [
    {
      "_id": "6921b25c14018fa7b06fcaf3",
      "resumeId": "6921b25c14018fa7b06fcaf3",
      "name": "Ranjani M",
      "email": "ranjani6@gmail.com",
      "role": "Backend Developer & API-Automation Tester",
      "location": "India",
      "skills": "[\"Node JS\", \"Express JS\", \"MongoDB\", ...]",
      "total_Experience": 2.5,
      "bm25Rank": 2,
      "bm25Score": 4.204,
      "vectorRank": 2,
      "vectorScore": 4.204,
      "rerankRank": 1,
      "rank": 1,
      "score": 0.95,
      "reasoning": "Strong match: Node.js and MongoDB experience",
      "snippet": "RANJANI M BackendDeveloper| API and Automation Tester..."
    }
  ],
  "timings": {
    "embeddingMs": 0,
    "bm25Ms": 0,
    "vectorMs": 0,
    "rerankMs": 948,
    "summarizeMs": 0,
    "totalMs": 1481
  },
  "fallbackReasons": []
}
```

**Parameters:**
- `query` (required): Search query string
- `topK` (optional): 1-100, default 20 — total candidates to return
- `rerankTopK` (optional): 1-50, default 10 — candidates to rerank
- `rerank` (optional): boolean, default true — enable LLM reranking
- `summarize` (optional): boolean, default false — generate fit summaries
- `summarizeStyle` (optional): `"short"` or `"detailed"`, default "short"
- `maxSummarizeTokens` (optional): 50-4000, default 300
- `filters` (optional): MongoDB filters (e.g., minYearsExperience, location)

**Examples:**

**Basic search with reranking:**
```bash
curl -X POST http://localhost:3000/v1/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Senior Node.js backend engineer with MongoDB",
    "topK": 10,
    "rerank": true
  }'
```

**Full pipeline with summarization:**
```bash
curl -X POST http://localhost:3000/v1/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Senior Node.js backend engineer",
    "topK": 20,
    "rerankTopK": 10,
    "rerank": true,
    "summarize": true,
    "summarizeStyle": "detailed",
    "maxSummarizeTokens": 500
  }'
```

**With filters:**
```bash
curl -X POST http://localhost:3000/v1/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "backend engineer",
    "topK": 15,
    "filters": {
      "minYearsExperience": 5,
      "location": "India"
    },
    "rerank": true,
    "summarize": false
  }'
```

**Hybrid search without reranking:**
```bash
curl -X POST http://localhost:3000/v1/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "full-stack engineer",
    "topK": 10,
    "rerank": false,
    "summarize": false
  }'
```

---

## Response Format

All endpoints return structured JSON with:
- `requestId`: Unique request identifier for tracing
- `timings`: Component-level timing metrics (in milliseconds)
- `error` (on failure): Error message with context
- Endpoint-specific data

---

## Error Handling

### 400 Bad Request
- Missing required parameters
- Invalid parameter types/values
- Out-of-bounds values (e.g., topK > 100)

**Example:**
```json
{
  "error": "query (string) is required",
  "requestId": "..."
}
```

### 502 Bad Gateway
- LLM service unavailable
- Vector search index misconfigured
- External API failures (Mistral, Groq)

**Example:**
```json
{
  "error": "LLM API error: 404 Not Found",
  "requestId": "...",
  "timings": { "rerankMs": 421 }
}
```

---

## Fallback Logic

The system gracefully degrades if components fail:
- **Vector search fails** → Falls back to BM25 only
- **Reranking fails** → Uses hybrid BM25/vector ordering
- **Summarization fails** → Returns results without summaries

Check `fallbackReasons` in response for details.

---

## Performance Notes

- P50 latency: 500-1000ms (with reranking)
- P95 latency: 2000-3000ms (with summarization)
- Designed for low-moderate traffic (~10-50 QPS)
- All operations are synchronous

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `NODE_ENV` | development | Environment |
| `MONGODB_URI` | mongodb://localhost | MongoDB connection string |
| `MONGODB_DB` | resumes | Database name |
| `MONGODB_COLLECTION` | resumes | Collection name |
| `MONGODB_BM25_INDEX` | BM25_index | BM25 index name |
| `MONGODB_VECTOR_INDEX` | resume_vector_index | Vector index name |
| `MISTRAL_API_KEY` | (required) | Mistral API key |
| `GROQ_API_KEY` | (required) | Groq API key |
| `EMBEDDING_MODEL` | mistral-embed | Embedding model |
| `LLM_MODEL` | llama-3.3-70b-versatile | LLM model |
| `LOG_LEVEL` | info | Logging level |

---

## Project Structure

```
src/
├── app.ts              # Express app configuration
├── server.ts           # Server entry point
├── config/
│   └── index.ts        # Config loader (.env support)
├── db/
│   └── mongo.ts        # MongoDB connection
├── middleware/
│   ├── logger.ts       # Request logging
│   ├── requestId.ts    # Request ID middleware
│   └── errorHandler.ts # Error handling
├── routes/
│   ├── health.ts       # Health check endpoints
│   ├── embeddings.ts   # Embedding endpoint
│   ├── search.ts       # Search endpoints (BM25, vector, hybrid, end-to-end)
│   ├── rerank.ts       # Reranking endpoint
│   └── summarize.ts    # Summarization endpoint
├── services/
│   ├── SearchService.ts       # BM25, vector, hybrid, end-to-end search
│   ├── EmbeddingService.ts    # Mistral embeddings
│   └── LLMService.ts          # Groq reranking & summarization
└── types/
    └── index.ts        # TypeScript types
```

---

## Notes

- Embeddings are generated on-demand per query (no caching)
- All search operations are synchronous
- Request size limit: 200KB
- Vector index must be configured in MongoDB Atlas
- Ensure API keys have sufficient quota/permissions

## Search Pipeline Prompt — Orchestrating end-to-end search

Purpose
- Describe the end-to-end pipeline and fallback behavior so co-pilot can generate the orchestration code for `SearchService.endToEndSearch`.

System Instructions:
- The service must run steps synchronously in the order: generate embedding, bm25Search, vectorSearch, merge+dedupe, rerank via LLM on top N, optionally summarize top results. Include timings and structured logs. Implement robust fallbacks as described.

Input (example):
{
  "query": "Senior Node.js backend engineer with MongoDB experience",
  "filters": { "minYearsExperience": 5 },
  "options": { "topK": 20, "rerankTopN": 8, "summarize": true }
}

Required behaviors to implement (for co-pilot):
- Generate embedding via `EmbeddingService` and record `embeddingMs` in component timings.
- Run BM25 and vector searches; if either fails, mark fallback flags in response and proceed.
- Merge candidates (by `resumeId`) preserving best score from either source.
- Deduplicate strictly by `resumeId`.
- Call `LLMService.rerankCandidates` with `rerankTopN` candidates; if rerank fails, fall back to BM25-first ordering.
- If `options.summarize` is true, call `LLMService.summarizeCandidateFit` for top-K and attach summaries.

Response schema (server-side):
{
  "requestId": "...",
  "timings": { "embeddingMs": 0, "bm25Ms": 0, "vectorMs": 0, "rerankMs": 0, "summarizeMs": 0 },
  "fallbacks": { "bm25Fallback": false, "vectorFallback": false, "rerankFallback": false },
  "results": [ { "resumeId": "...", "score": 0.0, "summary": "..." } ]
}

Testing & validation (for co-pilot):
- Include unit tests to validate deduplication, fallback flags, and that rerank is called with correct number of candidates.

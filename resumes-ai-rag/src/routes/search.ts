import { Router, Request, Response } from 'express';
import SearchService from '../services/SearchService';

const router = Router();

router.post('/bm25', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { query, topK = 20, filters = {} } = req.body || {};
  if (!query || typeof query !== 'string') return res.status(400).json({ error: 'query (string) is required', requestId });

  const start = Date.now();
  try {
    const { results, timings } = await SearchService.bm25Search(query, filters, Number(topK));
    const elapsed = Date.now() - start;
    res.json({ requestId, query, topK: Number(topK), timings: { ...timings, totalMs: elapsed }, results });
  } catch (err: any) {
    const elapsed = Date.now() - start;
    res.status(500).json({ error: err?.message || 'bm25_search_failed', requestId, timings: { bm25Ms: elapsed } });
  }
});

router.post('/vector', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { query, topK = 20, filters = {} } = req.body || {};
  if (!query || typeof query !== 'string') return res.status(400).json({ error: 'query (string) is required', requestId });

  const start = Date.now();
  try {
    const { results, timings } = await SearchService.vectorSearch(query, filters, Number(topK));
    const elapsed = Date.now() - start;
    res.json({ requestId, query, topK: Number(topK), timings: { ...timings, totalMs: elapsed }, results });
  } catch (err: any) {
    const elapsed = Date.now() - start;
    res.status(500).json({ error: err?.message || 'vector_search_failed', requestId, timings: { vectorMs: elapsed } });
  }
});

router.post('/hybrid', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { query, topK = 20, filters = {} } = req.body || {};
  if (!query || typeof query !== 'string') return res.status(400).json({ error: 'query (string) is required', requestId });

  const start = Date.now();
  try {
    const result = await SearchService.hybridSearch(query, filters, { topK: Number(topK) });
    const elapsed = Date.now() - start;
    res.json({ requestId, query, topK: Number(topK), timings: { totalMs: elapsed }, result });
  } catch (err: any) {
    const elapsed = Date.now() - start;
    res.status(500).json({ error: err?.message || 'hybrid_search_failed', requestId, timings: { totalMs: elapsed } });
  }
});

// POST / - End-to-end pipeline: embeddings + BM25 + vector + hybrid + rerank + optional summarization
router.post('/', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const {
    query,
    topK,
    rerankTopK,
    rerank,
    summarize,
    summarizeStyle,
    maxSummarizeTokens,
    filters
  } = req.body || {};

  // Validate required input
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'query (string) is required', requestId });
  }

  // Validate optional parameters
  if (topK && (typeof topK !== 'number' || topK < 1 || topK > 100)) {
    return res.status(400).json({ error: 'topK must be a number between 1 and 100', requestId });
  }

  if (rerankTopK && (typeof rerankTopK !== 'number' || rerankTopK < 1 || rerankTopK > (topK || 100) || rerankTopK > 50)) {
    return res.status(400).json({
      error: 'rerankTopK must be a number between 1 and topK (max 50)',
      requestId
    });
  }

  if (typeof rerank !== 'undefined' && typeof rerank !== 'boolean') {
    return res.status(400).json({ error: 'rerank must be a boolean', requestId });
  }

  if (typeof summarize !== 'undefined' && typeof summarize !== 'boolean') {
    return res.status(400).json({ error: 'summarize must be a boolean', requestId });
  }

  if (summarizeStyle && !['short', 'detailed'].includes(summarizeStyle)) {
    return res.status(400).json({ error: 'summarizeStyle must be "short" or "detailed"', requestId });
  }

  if (maxSummarizeTokens && (typeof maxSummarizeTokens !== 'number' || maxSummarizeTokens < 50 || maxSummarizeTokens > 4000)) {
    return res.status(400).json({
      error: 'maxSummarizeTokens must be a number between 50 and 4000',
      requestId
    });
  }

  if (filters && typeof filters !== 'object') {
    return res.status(400).json({ error: 'filters must be an object', requestId });
  }

  const start = Date.now();
  try {
    const result = await SearchService.endToEndSearch(query, filters || {}, {
      topK: topK || 20,
      rerankTopK: rerankTopK || 10,
      rerank: rerank !== false,
      summarize: summarize === true,
      summarizeStyle: summarizeStyle || 'short',
      maxSummarizeTokens: maxSummarizeTokens || 300
    });

    const elapsed = Date.now() - start;
    res.json({
      requestId,
      query,
      candidatesCount: result.candidates?.length || 0,
      candidates: result.candidates || [],
      timings: {
        ...result.timings,
        totalMs: elapsed
      },
      fallbackReasons: result.fallbackReasons || []
    });
  } catch (err: any) {
    const elapsed = Date.now() - start;
    res.status(502).json({
      error: err?.message || 'search_failed',
      requestId,
      timings: { totalMs: elapsed }
    });
  }
});

export default router;

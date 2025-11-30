import { Router, Request, Response } from 'express';
import LLMService from '../services/LLMService';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { query, candidates, topK } = req.body || {};
  if (!query || typeof query !== 'string') return res.status(400).json({ error: 'query (string) is required', requestId });
  if (!Array.isArray(candidates) || candidates.length === 0) return res.status(400).json({ error: 'candidates (array) is required', requestId });

  const start = Date.now();
  try {
    const result = await LLMService.rerankCandidates(query, candidates, topK);
    const elapsed = Date.now() - start;
    res.json({ requestId, query, topK, timings: { rerankMs: elapsed }, result });
  } catch (err: any) {
    const elapsed = Date.now() - start;
    res.status(502).json({ error: err?.message || 'rerank_failed', requestId, timings: { rerankMs: elapsed } });
  }
});

export default router;

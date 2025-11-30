import { Router, Request, Response } from 'express';
import LLMService from '../services/LLMService';

const router = Router();

// POST /v1/search/summarize
router.post('/', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { query, candidate, style, maxTokens } = req.body || {};

  // Validate input
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'query (string) is required', requestId });
  }
  if (!candidate || typeof candidate !== 'object') {
    return res.status(400).json({ error: 'candidate (object) is required', requestId });
  }
  if (!candidate.resumeId || !candidate.snippet) {
    return res.status(400).json({
      error: 'candidate must contain resumeId and snippet',
      requestId
    });
  }
  if (style && !['short', 'detailed'].includes(style)) {
    return res.status(400).json({ error: 'style must be "short" or "detailed"', requestId });
  }
  if (maxTokens && (typeof maxTokens !== 'number' || maxTokens < 50 || maxTokens > 4000)) {
    return res.status(400).json({ error: 'maxTokens must be a number between 50 and 4000', requestId });
  }

  const start = Date.now();
  try {
    const result = await LLMService.summarizeCandidateFit(query, candidate, {
      style: style || 'short',
      maxTokens: maxTokens || 300
    });
    const elapsed = Date.now() - start;
    res.json({
      requestId,
      query,
      candidateId: candidate.resumeId,
      summary: result.summary,
      meta: result.meta,
      timings: { summarizeMs: elapsed }
    });
  } catch (err: any) {
    const elapsed = Date.now() - start;
    res.status(502).json({
      error: err?.message || 'summarize_failed',
      requestId,
      timings: { summarizeMs: elapsed }
    });
  }
});

export default router;

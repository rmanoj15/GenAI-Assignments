import { Router, Request, Response } from 'express';
import EmbeddingService from '../services/EmbeddingService';
import config from '../config';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  const { input, model } = req.body || {};
  if (!input || typeof input !== 'string') return res.status(400).json({ error: 'input (string) is required', requestId });

  const start = Date.now();
  try {
    const usedModel = model || config.embeddingModel;
    const embedding = await EmbeddingService.embed(input, usedModel);
    const elapsed = Date.now() - start;
    res.json({ requestId, model: usedModel, embedding, timings: { embeddingMs: elapsed } });
  } catch (err: any) {
    const elapsed = Date.now() - start;
    res.status(502).json({ error: err?.message || 'embedding_failed', requestId, timings: { embeddingMs: elapsed } });
  }
});

export default router;

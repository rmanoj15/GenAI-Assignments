import { Router, Request, Response } from 'express';
import config from '../config';
import { pingDb } from '../db/mongo';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const requestId = (req as any).requestId;
  res.json({
    app: config.appName,
    version: config.version,
    uptimeSeconds: process.uptime(),
    env: config.env,
    requestId,
  });
});

router.get('/db', async (req: Request, res: Response) => {
  try {
    const start = Date.now();
    const latencyMs = await pingDb();
    const totalMs = Date.now() - start;
    res.json({ ok: true, latencyMs, totalMs });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || 'db ping failed' });
  }
});

export default router;

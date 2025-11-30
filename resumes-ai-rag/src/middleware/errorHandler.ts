import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const status = err?.status || 500;
  const requestId = (req as any).requestId;
  // Log already done by pino, but ensure we respond with structured JSON
  res.status(status).json({
    error: err?.message || 'Internal Server Error',
    requestId,
  });
}

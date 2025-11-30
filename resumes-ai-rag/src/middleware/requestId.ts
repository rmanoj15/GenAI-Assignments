import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.header('x-request-id');
  const id = header || uuidv4();
  res.setHeader('x-request-id', id);
  // attach to request for handlers
  (req as any).requestId = id;
  next();
}

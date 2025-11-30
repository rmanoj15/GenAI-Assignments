import express from 'express';
import helmet from 'helmet';
import config from './config';
import healthRoutes from './routes/health';
import embeddingsRoutes from './routes/embeddings';
import searchRoutes from './routes/search';
import rerankRoutes from './routes/rerank';
import summarizeRoutes from './routes/summarize';
import { requestIdMiddleware } from './middleware/requestId';
import { httpLogger } from './middleware/logger';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Basic security headers
try { app.use(helmet()); } catch (e) { /* optional dev-safe: helmet may not be installed in minimal setups */ }

app.use(express.json({ limit: '200kb' }));
app.use(requestIdMiddleware);
app.use(httpLogger as any);

// Versioned API
app.use('/v1/health', healthRoutes);
app.use('/v1/embeddings', embeddingsRoutes);
app.use('/v1/search', searchRoutes);
app.use('/v1/search/rerank', rerankRoutes);
app.use('/v1/search/summarize', summarizeRoutes);

// Fallback route
app.use((req, res) => res.status(404).json({ error: 'Not Found', path: req.path }));

// Error handler
app.use(errorHandler);

export default app;


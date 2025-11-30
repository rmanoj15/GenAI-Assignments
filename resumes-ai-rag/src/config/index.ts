import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Try to load .env, fall back to `env` (some users edit a file named `env`)
const cwd = process.cwd();
const dotEnvPath = path.resolve(cwd, '.env');
const altEnvPath = path.resolve(cwd, 'env');
let loadedFrom: string | null = null;
if (fs.existsSync(dotEnvPath)) {
  dotenv.config({ path: dotEnvPath });
  loadedFrom = dotEnvPath;
} else if (fs.existsSync(altEnvPath)) {
  dotenv.config({ path: altEnvPath });
  loadedFrom = altEnvPath;
} else {
  // no local env file found — rely on environment variables
  dotenv.config();
}

const pkg = require('../../package.json');

export const config = {
  appName: pkg.name || 'resumes-ai-rag',
  version: pkg.version || '0.0.0',
  port: Number(process.env.PORT || 3000),
  env: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  mongodbDb: process.env.MONGODB_DB || 'resumes',
  mongodbCollection: process.env.MONGODB_COLLECTION || 'resumes',
  mongodbBm25Index: process.env.MONGODB_BM25_INDEX || 'BM25_index',
  mongodbVectorIndex: process.env.MONGODB_VECTOR_INDEX || 'resume_vector_index',
  embeddingModel: process.env.EMBEDDING_MODEL || 'mistral-embed',
  llmModel: process.env.LLM_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct',
  logLevel: process.env.LOG_LEVEL || 'info',
  _loadedEnvFile: loadedFrom // internal: which env file was loaded, may be undefined
};

export default config;

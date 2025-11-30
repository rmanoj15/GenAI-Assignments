import http from 'http';
import app from './app';
import config from './config';
import { connectToMongo, closeMongo } from './db/mongo';
import logger from './middleware/logger';

async function start() {
  try {
    await connectToMongo();
    const server = http.createServer(app as any);
    server.listen(config.port, () => {
      logger.info({ port: config.port }, `Server listening on port ${config.port}`);
    });

    const shutdown = async () => {
      logger.info('Shutting down...');
      server.close();
      await closeMongo();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err: any) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

start();

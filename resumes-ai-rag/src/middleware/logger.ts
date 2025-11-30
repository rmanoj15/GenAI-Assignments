import pino from 'pino';
import pinoHttp from 'pino-http';
import config from '../config';

const logger = pino({ level: config.logLevel });

export const httpLogger = pinoHttp({ logger });

export default logger;

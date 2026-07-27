import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { randomUUID } from 'node:crypto';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(
  pinoHttp<Request, Response>({
    logger,
    genReqId: (req) => {
      const existingId = req.headers['x-request-id'];
      const requestId = typeof existingId === 'string' ? existingId : randomUUID();
      req.requestId = requestId;
      return requestId;
    },
    customProps: (req) => ({
      requestId: req.requestId,
    }),
  }),
);

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

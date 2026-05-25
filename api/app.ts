import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { communityRouter } from './routes/community.js';
import { usersRouter } from './routes/users.js';
import { vouchersRouter } from './routes/vouchers.js';
import { errorHandler } from './middleware/error-handler.js';

export const createApp = () => {
  const app = express();

  if (process.env.CORS_ORIGIN) {
    app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
  }

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ data: { ok: true }, error: null });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/vouchers', vouchersRouter);
  app.use('/api/users', usersRouter);
  app.use('/api', communityRouter);

  app.use(errorHandler);

  return app;
};

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { authRouter } from './routes/auth.js';
import { communityRouter } from './routes/community.js';
import { usersRouter } from './routes/users.js';
import { vouchersRouter } from './routes/vouchers.js';
import { errorHandler } from './middleware/error-handler.js';
import { fail, ok } from './lib/http.js';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { data: null, error: { message: 'Too many attempts, please try again later' } },
});

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { data: null, error: { message: 'Too many requests, please slow down' } },
});

export const createApp = () => {
  const app = express();

  app.use(helmet());

  if (process.env.CORS_ORIGIN) {
    app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
  }

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    ok(res, { ok: true, status: 'ok' });
  });

  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/signup', authLimiter);
  app.use('/api/vouchers', writeLimiter);
  app.use('/api/users', writeLimiter);
  app.use('/api/requests', writeLimiter);

  app.use('/api/auth', authRouter);
  app.use('/api/vouchers', vouchersRouter);
  app.use('/api/users', usersRouter);
  app.use('/api', communityRouter);

  app.use((req, res) => {
    fail(res, 404, 'Not found');
  });

  app.use(errorHandler);

  return app;
};

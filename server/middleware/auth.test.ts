import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from './error-handler.js';
import { requireAuth, requireRole, type AuthedRequest } from './auth.js';
import { signAuthToken } from '../lib/token.js';

const users = new Map<string, { role?: string }>();

vi.mock('../lib/db', () => ({ connectDb: vi.fn(async () => undefined) }));
vi.mock('../models/User', () => ({
  User: {
    findById: vi.fn(async (id: string) => users.get(id) ?? null),
  },
}));

const createRoleApp = () => {
  const app = express();
  app.get('/business', requireAuth, requireRole('business'), (req, res) => {
    res.json({ role: (req as AuthedRequest).userRole });
  });
  app.get('/customer', requireAuth, requireRole('customer'), (req, res) => {
    res.json({ role: (req as AuthedRequest).userRole });
  });
  app.use(errorHandler);
  return app;
};

const authCookie = (userId: string) => `auth_token=${signAuthToken({ userId }, '12h')}`;

describe('role authorization middleware', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    users.clear();
  });

  it('loads and attaches an allowed persisted role', async () => {
    users.set('business-user', { role: 'business' });

    const response = await request(createRoleApp())
      .get('/business')
      .set('Cookie', authCookie('business-user'))
      .expect(200);

    expect(response.body.role).toBe('business');
  });

  it('resolves a missing persisted role to customer', async () => {
    users.set('legacy-user', { role: undefined });

    const response = await request(createRoleApp())
      .get('/customer')
      .set('Cookie', authCookie('legacy-user'))
      .expect(200);

    expect(response.body.role).toBe('customer');
  });

  it('returns 401 when the authenticated user no longer exists', async () => {
    const response = await request(createRoleApp())
      .get('/business')
      .set('Cookie', authCookie('missing-user'))
      .expect(401);

    expect(response.body.error.message).toBe('Authentication required');
  });

  it('returns 403 when the persisted role is not allowed', async () => {
    users.set('customer-user', { role: 'customer' });

    const response = await request(createRoleApp())
      .get('/business')
      .set('Cookie', authCookie('customer-user'))
      .expect(403);

    expect(response.body.error.message).toBe('Forbidden');
  });
});

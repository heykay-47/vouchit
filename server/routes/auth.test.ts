import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app';

const users = new Map<string, any>();
const favorites: any[] = [];
const redeemedVouchers: any[] = [];

vi.mock('../lib/db', () => ({ connectDb: vi.fn(async () => undefined) }));
vi.mock('../models/User', () => ({
  User: {
    findOne: vi.fn(async (query: any) => {
      if (query.email) return users.get(query.email) ?? null;
      return null;
    }),
    findById: vi.fn(async (id: string) => {
      return Array.from(users.values()).find((user) => user._id.toString() === id) ?? null;
    }),
    create: vi.fn(async (doc: any) => {
      const user = {
        _id: { toString: () => '507f1f77bcf86cd799439011' },
        ...doc,
        createdAt: new Date('2026-05-20T00:00:00.000Z'),
      };
      users.set(doc.email, user);
      return user;
    }),
  },
}));vi.mock('../models/Favorite', () => ({
  Favorite: {
    find: vi.fn(async (query: any) => favorites.filter((favorite) => favorite.userId === query.userId)),
  },
}));
vi.mock('../models/RedeemedVoucher', () => ({
  RedeemedVoucher: {
    find: vi.fn(async (query: any) => redeemedVouchers.filter((redeemed) => redeemed.userId === query.userId)),
  },
}));

describe('auth routes', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    users.clear();
    favorites.length = 0;
    redeemedVouchers.length = 0;
  });

  it('signs up and returns current user', async () => {
    const res = await request(createApp())
      .post('/api/auth/signup')
      .send({ email: 'student@example.com', username: 'student', password: 'secret123', rememberMe: true })
      .expect(201);

    expect(res.body.data.user.email).toBe('student@example.com');
    expect(res.headers['set-cookie'][0]).toContain('auth_token=');
  });

  it('rejects duplicate email', async () => {
    await request(createApp())
      .post('/api/auth/signup')
      .send({ email: 'student@example.com', username: 'student', password: 'secret123' });

    const res = await request(createApp())
      .post('/api/auth/signup')
      .send({ email: 'student@example.com', username: 'other', password: 'secret123' })
      .expect(409);

    expect(res.body.error.message).toBe('An account with this email already exists');
  });

  it('rejects signup with password shorter than 8 chars', async () => {
    const res = await request(createApp())
      .post('/api/auth/signup')
      .send({ email: 'short@example.com', username: 'short', password: 'short1' })
      .expect(400);

    expect(res.body.error).toBeTruthy();
  });

  it('login with unregistered email returns 401 (timing-safe)', async () => {
    const start = Date.now();
    const res = await request(createApp())
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'whatever123' })
      .expect(401);
    const elapsed = Date.now() - start;

    expect(res.body.error.message).toBe('Invalid email or password');
    // bcrypt ran (dummy hash) — should take a measurable amount of time.
    expect(elapsed).toBeGreaterThanOrEqual(20);
  });

  it('returns favorite and redeemed voucher ids for current user', async () => {
    const signup = await request(createApp())
      .post('/api/auth/signup')
      .send({ email: 'student@example.com', username: 'student', password: 'secret123', rememberMe: true })
      .expect(201);

    favorites.push({
      userId: '507f1f77bcf86cd799439011',
      voucherId: { toString: () => '507f1f77bcf86cd799439012' },
    });
    redeemedVouchers.push({
      userId: '507f1f77bcf86cd799439011',
      voucherId: { toString: () => '507f1f77bcf86cd799439013' },
    });

    const res = await request(createApp())
      .get('/api/auth/me')
      .set('Cookie', signup.headers['set-cookie'])
      .expect(200);

    expect(res.body.data.user.favorites).toEqual(['507f1f77bcf86cd799439012']);
    expect(res.body.data.user.redeemedVouchers).toEqual(['507f1f77bcf86cd799439013']);
  });
});

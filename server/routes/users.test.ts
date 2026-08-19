import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { signAuthToken } from '../lib/token.js';

const favorites = new Set<string>();
const users = new Map<string, any>();

vi.mock('../lib/db', () => ({ connectDb: vi.fn(async () => undefined) }));
vi.mock('../models/User', () => ({
  User: {
    findByIdAndUpdate: vi.fn(async (id: string, update: any) => {
      const user = users.get(id) ?? {
        _id: { toString: () => id },
        email: 'student@example.com',
        username: 'student',
        bio: null,
        profileImage: null,
        notificationPreferences: {},
        createdAt: new Date('2026-05-20T00:00:00.000Z'),
        passwordHash: '$2a$10$secretHashShouldNotLeak',
      };
      const updated = { ...user, ...update };
      users.set(id, updated);
      return updated;
    }),
  },
}));
vi.mock('../models/Favorite', () => ({
  Favorite: {
    find: vi.fn(async () => []),
    create: vi.fn(async (doc: any) => {
      const key = `${doc.userId}:${doc.voucherId}`;
      if (favorites.has(key)) {
        const error = new Error('duplicate') as Error & { code?: number };
        error.code = 11000;
        throw error;
      }
      favorites.add(key);
      return doc;
    }),
    deleteOne: vi.fn(async () => ({})),
  },
}));
vi.mock('../models/RedeemedVoucher', () => ({
  RedeemedVoucher: { find: vi.fn(async () => []) },
}));
vi.mock('../models/Voucher', () => ({
  Voucher: {
    exists: vi.fn(async (query: any) => {
    const known = ['507f1f77bcf86cd799439012'];
    return known.includes(String(query._id)) ? { _id: query._id } : null;
    }),
  },
}));

describe('user routes', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    favorites.clear();
    users.clear();
  });

  it('PATCH /me does not leak passwordHash', async () => {
    const token = signAuthToken({ userId: '507f1f77bcf86cd799439011' }, '1h');
    const res = await request(createApp())
      .patch('/api/users/me')
      .set('Cookie', [`auth_token=${token}`])
      .send({ bio: 'hello' })
      .expect(200);

    expect(res.body.data.user.bio).toBe('hello');
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.user.email).toBe('student@example.com');
  });

  it('returns conflict when favorite already exists', async () => {
    const token = signAuthToken({ userId: '507f1f77bcf86cd799439011' }, '1h');
    const cookie = [`auth_token=${token}`];

    await request(createApp())
      .post('/api/users/me/favorites/507f1f77bcf86cd799439012')
      .set('Cookie', cookie)
      .expect(200);

    const res = await request(createApp())
      .post('/api/users/me/favorites/507f1f77bcf86cd799439012')
      .set('Cookie', cookie)
      .expect(409);

    expect(res.body.error.message).toBe('Voucher is already in favorites');
  });

  it('returns 400 for invalid voucher id on favorite', async () => {
    const token = signAuthToken({ userId: '507f1f77bcf86cd799439011' }, '1h');
    const res = await request(createApp())
      .post('/api/users/me/favorites/not-an-id')
      .set('Cookie', [`auth_token=${token}`])
      .expect(400);

    expect(res.body.error.message).toBe('Invalid voucher id');
  });

  it('returns 404 when favoriting a nonexistent voucher', async () => {
    const token = signAuthToken({ userId: '507f1f77bcf86cd799439011' }, '1h');
    const res = await request(createApp())
      .post('/api/users/me/favorites/507f1f77bcf86cd799439099')
      .set('Cookie', [`auth_token=${token}`])
      .expect(404);

    expect(res.body.error.message).toBe('Voucher not found');
  });
});

import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app';
import { signAuthToken } from '../lib/token';

const favorites = new Set<string>();

vi.mock('../lib/db', () => ({ connectDb: vi.fn(async () => undefined) }));
vi.mock('../models/User', () => ({
  User: {
    findByIdAndUpdate: vi.fn(async () => ({ notificationPreferences: {} })),
  },
}));
vi.mock('../models/Favorite', () => ({
  Favorite: {
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

describe('user routes', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    favorites.clear();
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
});

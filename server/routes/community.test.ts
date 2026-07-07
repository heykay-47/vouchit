import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app';
import { signAuthToken } from '../lib/token';

const requests: any[] = [];

vi.mock('../lib/db', () => ({ connectDb: vi.fn(async () => undefined) }));
vi.mock('../models/VoucherRequest', () => {
  const chain = {
    sort: () => chain,
    skip: () => chain,
    limit: async () => requests,
  };
  return {
    VoucherRequest: {
      find: vi.fn(() => chain),
      create: vi.fn(async (doc: any) => {
        const requestDoc = {
          _id: { toString: () => '507f1f77bcf86cd799439020' },
          ...doc,
          responses: 0,
          isActive: true,
          createdAt: new Date('2026-05-20T00:00:00.000Z'),
        };
        requests.push(requestDoc);
        return requestDoc;
      }),
    },
  };
});
vi.mock('../models/User', () => ({ User: { find: vi.fn(async () => []) } }));
vi.mock('../models/Notification', () => {
  const notifications: any[] = [];
  const chain = {
    sort: () => chain,
    skip: () => chain,
    limit: async () => notifications,
  };
  return {
    Notification: {
      find: vi.fn(() => chain),
      findOneAndUpdate: vi.fn(async (filter: any) => {
        if (String(filter._id) === '507f1f77bcf86cd799439099') return null;
        return {
          _id: filter._id,
          userId: filter.userId,
          type: 'info',
          title: 'Test',
          message: 'Hello',
          relatedVoucherId: null,
          isRead: true,
          createdAt: new Date('2026-05-20T00:00:00.000Z'),
        };
      }),
    },
  };
});
vi.mock('../models/Activity', () => {
  const chain = {
    sort: () => chain,
    skip: () => chain,
    limit: async () => [],
  };
  return { Activity: { find: vi.fn(() => chain) } };
});
vi.mock('../models/Voucher', () => ({ Voucher: { aggregate: vi.fn(async () => []) } }));

describe('community routes', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    requests.length = 0;
  });

  it('lists voucher requests', async () => {
    requests.push({
      _id: { toString: () => '507f1f77bcf86cd799439020' },
      userId: { toString: () => '507f1f77bcf86cd799439011' },
      title: 'Need food voucher',
      description: 'Any grocery coupon',
      category: 'Food',
      responses: 0,
      isActive: true,
      createdAt: new Date('2026-05-20T00:00:00.000Z'),
    });

    const res = await request(createApp()).get('/api/requests').expect(200);
    expect(res.body.data.requests[0].title).toBe('Need food voucher');
  });

  it('serializes created voucher requests', async () => {
    const token = signAuthToken({ userId: '507f1f77bcf86cd799439011' }, '1h');

    const res = await request(createApp())
      .post('/api/requests')
      .set('Cookie', [`auth_token=${token}`])
      .send({ title: 'Need food voucher', description: 'Any grocery coupon', category: 'Food' })
      .expect(201);

    expect(res.body.data.request).toEqual({
      id: '507f1f77bcf86cd799439020',
      userId: '507f1f77bcf86cd799439011',
      username: 'Anonymous',
      title: 'Need food voucher',
      description: 'Any grocery coupon',
      category: 'Food',
      responses: 0,
      isActive: true,
      createdAt: '2026-05-20T00:00:00.000Z',
    });
    expect(res.body.data.request._id).toBeUndefined();
  });

  it('returns 400 for invalid notification id', async () => {
    const token = signAuthToken({ userId: '507f1f77bcf86cd799439011' }, '1h');
    const res = await request(createApp())
      .patch('/api/notifications/not-an-id/read')
      .set('Cookie', [`auth_token=${token}`])
      .expect(400);

    expect(res.body.error.message).toBe('Invalid notification id');
  });

  it('returns 404 for missing notification', async () => {
    const token = signAuthToken({ userId: '507f1f77bcf86cd799439011' }, '1h');
    const res = await request(createApp())
      .patch('/api/notifications/507f1f77bcf86cd799439099/read')
      .set('Cookie', [`auth_token=${token}`])
      .expect(404);

    expect(res.body.error.message).toBe('Notification not found');
  });
});

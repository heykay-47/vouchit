import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app';
import { signAuthToken } from '../lib/token';

const requests: any[] = [];

vi.mock('../lib/db', () => ({ connectDb: vi.fn(async () => undefined) }));
vi.mock('../models/VoucherRequest', () => ({
  VoucherRequest: {
    find: vi.fn(() => ({ sort: async () => requests })),
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
}));
vi.mock('../models/User', () => ({ User: { find: vi.fn(async () => []) } }));
vi.mock('../models/Notification', () => ({ Notification: { find: vi.fn(() => ({ sort: async () => [] })) } }));
vi.mock('../models/Activity', () => ({ Activity: { find: vi.fn(() => ({ sort: () => ({ limit: async () => [] }) })) } }));
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
});

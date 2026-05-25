import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app';
import { signAuthToken } from '../lib/token';

const vouchers: any[] = [];
const comments: any[] = [];

vi.mock('../lib/db', () => ({ connectDb: vi.fn(async () => undefined) }));
vi.mock('../models/Activity', () => ({ Activity: { create: vi.fn(async () => ({})) } }));
vi.mock('../models/Voucher', () => ({
  Voucher: {
    find: vi.fn(() => ({ sort: () => ({ limit: async () => vouchers }) })),
    create: vi.fn(async (doc: any) => {
      const voucher = {
        _id: { toString: () => '507f1f77bcf86cd799439012' },
        ...doc,
        donatedAt: new Date('2026-05-20T00:00:00.000Z'),
        isRedeemed: false,
        reportCount: 0,
        isActive: true,
      };
      vouchers.push(voucher);
      return voucher;
    }),
    findById: vi.fn(async (id: string) => vouchers.find((voucher) => voucher._id.toString() === id) ?? null),
  },
}));
vi.mock('../models/Comment', () => ({
  Comment: {
    find: vi.fn(() => ({ sort: async () => comments })),
    create: vi.fn(async (doc: any) => {
      const comment = {
        _id: { toString: () => '507f1f77bcf86cd799439030' },
        ...doc,
        createdAt: new Date('2026-05-20T00:00:00.000Z'),
      };
      comments.push(comment);
      return comment;
    }),
  },
}));
vi.mock('../models/User', () => ({
  User: {
    find: vi.fn(async () => []),
    findById: vi.fn(async () => ({ username: 'student' })),
  },
}));
vi.mock('../models/RedeemedVoucher', () => ({ RedeemedVoucher: { create: vi.fn(async () => ({})) } }));
vi.mock('../models/ReportedVoucher', () => ({ ReportedVoucher: { create: vi.fn(async () => ({})) } }));

describe('voucher routes', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    vouchers.length = 0;
    comments.length = 0;
  });

  it('creates a voucher for an authenticated user', async () => {
    const token = signAuthToken({ userId: '507f1f77bcf86cd799439011' }, '1h');

    const res = await request(createApp())
      .post('/api/vouchers')
      .set('Cookie', [`auth_token=${token}`])
      .send({
        platform: 'Google Pay',
        title: 'Save 10',
        description: 'Ten off',
        code: 'SAVE10',
        imageUrl: 'data:image/png;base64,abc',
        category: 'Shopping',
      })
      .expect(201);

    expect(res.body.data.voucher.title).toBe('Save 10');
    expect(res.body.data.voucher.donatedBy).toBe('507f1f77bcf86cd799439011');
  });

  it('rejects comments for nonexistent vouchers', async () => {
    const token = signAuthToken({ userId: '507f1f77bcf86cd799439011' }, '1h');

    const res = await request(createApp())
      .post('/api/vouchers/507f1f77bcf86cd799439012/comments')
      .set('Cookie', [`auth_token=${token}`])
      .send({ text: 'Does this still work?' })
      .expect(404);

    expect(res.body.error.message).toBe('Voucher not found');
    expect(comments).toHaveLength(0);
  });
});

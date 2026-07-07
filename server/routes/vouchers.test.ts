import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app';
import { signAuthToken } from '../lib/token';

const vouchers: any[] = [];
const comments: any[] = [];

vi.mock('../lib/db', () => ({ connectDb: vi.fn(async () => undefined) }));
vi.mock('../models/Activity', () => ({ Activity: { create: vi.fn(async () => ({})) } }));
vi.mock('../models/Voucher', () => {
  const chain = {
    sort: () => chain,
    skip: () => chain,
    limit: () => chain,
    lean: async () => vouchers,
  };
  return {
    Voucher: {
      find: vi.fn(() => chain),
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
      findOneAndUpdate: vi.fn(async (filter: any, update: any) => {
        const voucher = vouchers.find((voucher) => voucher._id.toString() === '507f1f77bcf86cd799439012');
        if (!voucher) return null;
        if (filter.isActive !== undefined && filter.isActive !== voucher.isActive) return null;
        if (filter.isRedeemed !== undefined && filter.isRedeemed !== voucher.isRedeemed) return null;
        if (filter.donatedBy && typeof filter.donatedBy === 'object' && filter.donatedBy.$ne !== undefined) {
          if (voucher.donatedBy && voucher.donatedBy.toString() === filter.donatedBy.$ne.toString()) return null;
        }
        Object.assign(voucher, update);
        return voucher;
      }),
      findByIdAndUpdate: vi.fn(async (id: string, update: any) => {
        const voucher = vouchers.find((voucher) => voucher._id.toString() === id);
        if (voucher) Object.assign(voucher, update);
        return voucher ?? null;
      }),
    },
  };
});
vi.mock('../models/Comment', () => {
  const chain = {
    sort: () => chain,
    limit: async () => comments,
  };
  return {
    Comment: {
      find: vi.fn(() => chain),
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
  };
});
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
    expect(res.body.data.voucher.code).toBe('SAVE10');
  });

  it('does not leak voucher codes in the public list', async () => {
    const token = signAuthToken({ userId: '507f1f77bcf86cd799439011' }, '1h');
    await request(createApp())
      .post('/api/vouchers')
      .set('Cookie', [`auth_token=${token}`])
      .send({
        platform: 'Google Pay',
        title: 'Save 10',
        description: 'Ten off',
        code: 'SECRET-CODE',
        imageUrl: 'https://res.cloudinary.com/test/x.png',
        category: 'Shopping',
      })
      .expect(201);

    const res = await request(createApp()).get('/api/vouchers').expect(200);

    expect(res.body.data.vouchers).toHaveLength(1);
    expect(res.body.data.vouchers[0].code).toBeUndefined();
    expect(res.body.data.vouchers[0].title).toBe('Save 10');
  });

  it('returns 400 for invalid voucher id on comments', async () => {
    const res = await request(createApp())
      .get('/api/vouchers/not-an-id/comments')
      .expect(400);

    expect(res.body.error.message).toBe('Invalid voucher id');
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

  it('includes voucher code in the list for the donor', async () => {
    const donorToken = signAuthToken({ userId: '507f1f77bcf86cd799439011' }, '1h');
    await request(createApp())
      .post('/api/vouchers')
      .set('Cookie', [`auth_token=${donorToken}`])
      .send({
        platform: 'Google Pay',
        title: 'Save 10',
        description: 'Ten off',
        code: 'DONOR-CODE',
        imageUrl: 'https://res.cloudinary.com/test/x.png',
        category: 'Shopping',
      })
      .expect(201);

    const res = await request(createApp())
      .get('/api/vouchers')
      .set('Cookie', [`auth_token=${donorToken}`])
      .expect(200);

    expect(res.body.data.vouchers).toHaveLength(1);
    expect(res.body.data.vouchers[0].code).toBe('DONOR-CODE');
  });

  it('omits voucher code in the list for other authenticated users', async () => {
    const donorToken = signAuthToken({ userId: '507f1f77bcf86cd799439011' }, '1h');
    const otherToken = signAuthToken({ userId: '507f1f77bcf86cd799439099' }, '1h');
    await request(createApp())
      .post('/api/vouchers')
      .set('Cookie', [`auth_token=${donorToken}`])
      .send({
        platform: 'Google Pay',
        title: 'Save 10',
        description: 'Ten off',
        code: 'DONOR-CODE',
        imageUrl: 'https://res.cloudinary.com/test/x.png',
        category: 'Shopping',
      })
      .expect(201);

    const res = await request(createApp())
      .get('/api/vouchers')
      .set('Cookie', [`auth_token=${otherToken}`])
      .expect(200);

    expect(res.body.data.vouchers).toHaveLength(1);
    expect(res.body.data.vouchers[0].code).toBeUndefined();
  });

  it('rejects a donor from redeeming their own voucher', async () => {
    const donorToken = signAuthToken({ userId: '507f1f77bcf86cd799439011' }, '1h');
    await request(createApp())
      .post('/api/vouchers')
      .set('Cookie', [`auth_token=${donorToken}`])
      .send({
        platform: 'Google Pay',
        title: 'Self-redeem',
        description: 'Should not be redeemable by donor',
        code: 'OWN-CODE',
        imageUrl: 'https://res.cloudinary.com/test/x.png',
        category: 'Shopping',
      })
      .expect(201);

    const res = await request(createApp())
      .post('/api/vouchers/507f1f77bcf86cd799439012/redeem')
      .set('Cookie', [`auth_token=${donorToken}`])
      .expect(409);

    expect(res.body.error.message).toBe('Voucher is not available');
    expect(vouchers[0].isRedeemed).toBe(false);
  });

  it('includes voucher code in the list for the redeemer after redeem', async () => {
    const donorToken = signAuthToken({ userId: '507f1f77bcf86cd799439011' }, '1h');
    const redeemerToken = signAuthToken({ userId: '507f1f77bcf86cd799439022' }, '1h');
    const bystanderToken = signAuthToken({ userId: '507f1f77bcf86cd799439099' }, '1h');

    await request(createApp())
      .post('/api/vouchers')
      .set('Cookie', [`auth_token=${donorToken}`])
      .send({
        platform: 'Google Pay',
        title: 'Save 10',
        description: 'Ten off',
        code: 'REDEEM-CODE',
        imageUrl: 'https://res.cloudinary.com/test/x.png',
        category: 'Shopping',
      })
      .expect(201);

    await request(createApp())
      .post('/api/vouchers/507f1f77bcf86cd799439012/redeem')
      .set('Cookie', [`auth_token=${redeemerToken}`])
      .expect(200);

    const redeemerRes = await request(createApp())
      .get('/api/vouchers')
      .set('Cookie', [`auth_token=${redeemerToken}`])
      .expect(200);
    expect(redeemerRes.body.data.vouchers[0].code).toBe('REDEEM-CODE');

    const donorRes = await request(createApp())
      .get('/api/vouchers')
      .set('Cookie', [`auth_token=${donorToken}`])
      .expect(200);
    expect(donorRes.body.data.vouchers[0].code).toBe('REDEEM-CODE');

    const bystanderRes = await request(createApp())
      .get('/api/vouchers')
      .set('Cookie', [`auth_token=${bystanderToken}`])
      .expect(200);
    expect(bystanderRes.body.data.vouchers[0].code).toBeUndefined();
  });
});

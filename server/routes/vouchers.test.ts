import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { signAuthToken } from '../lib/token.js';
import { BusinessProfile } from '../models/BusinessProfile.js';
import { Campaign } from '../models/Campaign.js';
import { Voucher } from '../models/Voucher.js';

const vouchers: any[] = [];
const comments: any[] = [];
const campaigns: any[] = [];
const profiles: any[] = [];

const sameId = (left: any, right: any) => left?.toString?.() === right?.toString?.();
const matchesFilter = (document: any, filter: any): boolean => Object.entries(filter).every(([key, value]) => {
  if (key === '$or') return (value as any[]).some((condition) => matchesFilter(document, condition));
  if (key === '$and') return (value as any[]).every((condition) => matchesFilter(document, condition));
  if (value && typeof value === 'object' && '$exists' in value) {
    return value.$exists ? document[key] !== undefined : document[key] === undefined;
  }
  if (value && typeof value === 'object' && '$gt' in value) {
    return document[key] != null && document[key] > value.$gt;
  }
  if (value && typeof value === 'object' && '$in' in value) {
    return (value.$in as any[]).some((candidate: any) => sameId(document[key], candidate));
  }
  if (value && typeof value === 'object' && '$ne' in value) return !sameId(document[key], value.$ne);
  if (value === null) return document[key] == null;
  return sameId(document[key], value) || document[key] === value;
});

vi.mock('../lib/db', () => ({ connectDb: vi.fn(async () => undefined) }));
vi.mock('express-rate-limit', () => ({ default: () => (_req: any, _res: any, next: any) => next() }));
vi.mock('../models/Activity', () => ({ Activity: { create: vi.fn(async () => ({})) } }));
vi.mock('../models/Voucher', () => {
  let query: any = {};
  const chain = {
    sort: () => chain,
    skip: () => chain,
    limit: () => chain,
    lean: async () => vouchers.filter((voucher) => matchesFilter(voucher, query)),
  };
  return {
    Voucher: {
      find: vi.fn((filter: any) => {
        query = filter;
        return chain;
      }),
      exists: vi.fn(async (filter: any) => vouchers.some((voucher) => (
        voucher.campaignId?.toString() === filter.campaignId?.toString()
        && voucher.sourceType === filter.sourceType
        && voucher.isRedeemed === filter.isRedeemed
      ))),
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
        if (filter.$or?.length && !filter.$or.some((condition: any) => (
          (condition.expiryDate === null && (voucher.expiryDate == null))
          || (condition.expiryDate?.$exists === false && voucher.expiryDate === undefined)
          || (condition.expiryDate?.$gt && (!voucher.expiryDate || voucher.expiryDate > condition.expiryDate.$gt))
        ))) return null;
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
vi.mock('../models/Campaign', () => ({
  Campaign: {
    find: vi.fn((filter: any) => {
      const chain = {
        select: () => chain,
        lean: async () => campaigns.filter((campaign) => matchesFilter(campaign, filter)),
      };
      return chain;
    }),
    findOneAndUpdate: vi.fn(async (filter: any, update: any) => {
      const campaign = campaigns.find((item) => item._id.toString() === filter._id.toString()
        && item.status === filter.status);
      if (campaign) Object.assign(campaign, update.$set ?? update);
      return campaign ?? null;
    }),
  },
}));
vi.mock('../models/BusinessProfile', () => ({
  BusinessProfile: {
    find: vi.fn(() => ({ lean: async () => profiles })),
  },
}));
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
    findById: vi.fn(async (id: string) => ({
      username: 'student',
      role: id === '507f1f77bcf86cd799439099' ? 'business' : 'customer',
    })),
  },
}));
vi.mock('../models/RedeemedVoucher', () => ({ RedeemedVoucher: { create: vi.fn(async () => ({})) } }));
vi.mock('../models/ReportedVoucher', () => ({ ReportedVoucher: { create: vi.fn(async () => ({})) } }));

const validBodyFor = (path: string) => {
  if (path === '/api/vouchers') {
    return {
      platform: 'Google Pay',
      title: 'Save 10',
      description: 'Ten off',
      code: 'SAVE10',
      imageUrl: 'data:image/png;base64,abc',
      category: 'Shopping',
    };
  }

  if (path.endsWith('/comments')) return { text: 'Is this still valid?' };
  return {};
};

describe('voucher routes', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    vouchers.length = 0;
    campaigns.length = 0;
    profiles.length = 0;
    comments.length = 0;
    vi.clearAllMocks();
  });

  it.each([
    ['post', '/api/vouchers'],
    ['post', '/api/vouchers/507f1f77bcf86cd799439012/redeem'],
    ['post', '/api/vouchers/507f1f77bcf86cd799439012/report'],
    ['post', '/api/vouchers/507f1f77bcf86cd799439012/comments'],
  ])('rejects business mutation %s %s', async (method, path) => {
    const businessToken = signAuthToken({ userId: '507f1f77bcf86cd799439099' }, '1h');

    await (request(createApp()) as any)[method](path)
      .set('Cookie', [`auth_token=${businessToken}`])
      .send(validBodyFor(path))
      .expect(403);
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
    expect(bystanderRes.body.data.vouchers).toHaveLength(0);
  });

  it('queries vouchers visible to the authenticated viewer', async () => {
    const token = signAuthToken({ userId: '507f1f77bcf86cd799439011' }, '1h');

    await request(createApp())
      .get('/api/vouchers')
      .set('Cookie', [`auth_token=${token}`])
      .expect(200);

    expect(Voucher.find).toHaveBeenCalledWith(expect.objectContaining({ $or: expect.any(Array) }));
  });

  it('excludes inactive, expired, and unpaid campaign inventory from the public list', async () => {
    const activeCampaign = {
      _id: { toString: () => '507f1f77bcf86cd799439013' },
      status: 'active',
      expiryDate: new Date('2026-09-01T00:00:00.000Z'),
    };
    const unpaidCampaign = {
      _id: { toString: () => '507f1f77bcf86cd799439014' },
      status: 'awaiting_payment',
      expiryDate: new Date('2026-09-01T00:00:00.000Z'),
    };
    const expiredCampaign = {
      _id: { toString: () => '507f1f77bcf86cd799439015' },
      status: 'active',
      expiryDate: new Date('2026-08-18T00:00:00.000Z'),
    };
    campaigns.push(activeCampaign, unpaidCampaign, expiredCampaign);
    vouchers.push(
      { _id: { toString: () => '507f1f77bcf86cd799439016' }, sourceType: 'campaign', campaignId: activeCampaign._id, isActive: true, isRedeemed: false },
      { _id: { toString: () => '507f1f77bcf86cd799439017' }, sourceType: 'campaign', campaignId: unpaidCampaign._id, isActive: true, isRedeemed: false },
      { _id: { toString: () => '507f1f77bcf86cd799439018' }, sourceType: 'campaign', campaignId: expiredCampaign._id, isActive: true, isRedeemed: false },
      { _id: { toString: () => '507f1f77bcf86cd799439019' }, sourceType: 'campaign', campaignId: activeCampaign._id, isActive: false, isRedeemed: false },
      { _id: { toString: () => '507f1f77bcf86cd799439020' }, sourceType: 'campaign', campaignId: activeCampaign._id, isActive: true, isRedeemed: true },
    );
    const res = await request(createApp()).get('/api/vouchers').expect(200);

    expect(res.body.data.vouchers).toHaveLength(1);
    expect(res.body.data.vouchers[0].id).toBe('507f1f77bcf86cd799439016');
    const query = (Voucher.find as any).mock.calls[0][0] as any;
    expect(query).toEqual(expect.objectContaining({ $or: expect.any(Array) }));
    expect(query.$and[0].$or).toEqual(expect.arrayContaining([
      { sourceType: 'community' },
      { sourceType: { $exists: false } },
    ]));
  });

  it('batch-loads campaign and business profile attribution for campaign cards', async () => {
    const campaign = {
      _id: { toString: () => '507f1f77bcf86cd799439013' },
      businessId: '507f1f77bcf86cd799439011',
      businessProfileId: { toString: () => '507f1f77bcf86cd799439014' },
      brandName: 'Fresh Market',
      title: 'Save on groceries',
      description: 'A grocery offer',
      platform: 'Google Pay',
      category: 'Shopping',
      imageUrl: 'https://example.com/campaign.png',
      expiryDate: new Date('2026-09-01T00:00:00.000Z'),
      status: 'active',
    };
    campaigns.push(campaign);
    profiles.push({ _id: campaign.businessProfileId, organizationName: 'Fresh Market Ltd' });
    vouchers.push({
      _id: { toString: () => '507f1f77bcf86cd799439015' },
      sourceType: 'campaign',
      campaignId: campaign._id,
      donatedBy: campaign.businessId,
      code: 'CAMPAIGN-CODE',
      isActive: true,
      isRedeemed: false,
      expiryDate: campaign.expiryDate,
    });

    const res = await request(createApp()).get('/api/vouchers').expect(200);

    expect(res.body.data.vouchers[0]).toMatchObject({
      sourceType: 'campaign',
      title: 'Save on groceries',
      campaign: {
        campaignId: campaign._id.toString(),
        brandName: 'Fresh Market',
        organizationName: 'Fresh Market Ltd',
      },
    });
    expect(res.body.data.vouchers[0].code).toBeUndefined();
    expect(BusinessProfile.find).toHaveBeenCalledWith({ _id: { $in: [campaign.businessProfileId.toString()] } });
    expect(Campaign.find).toHaveBeenNthCalledWith(2, { _id: { $in: [campaign._id.toString()] } });
  });

  it('does not expose campaign history to its owning business through the generic list', async () => {
    const ownerId = '507f1f77bcf86cd799439099';
    const unpaidCampaign = {
      _id: { toString: () => '507f1f77bcf86cd799439013' },
      businessId: ownerId,
      status: 'awaiting_payment',
      expiryDate: new Date('2026-09-01T00:00:00.000Z'),
    };
    const inactiveCampaign = {
      _id: { toString: () => '507f1f77bcf86cd799439014' },
      businessId: ownerId,
      status: 'active',
      expiryDate: new Date('2026-09-01T00:00:00.000Z'),
    };
    const expiredCampaign = {
      _id: { toString: () => '507f1f77bcf86cd799439015' },
      businessId: ownerId,
      status: 'active',
      expiryDate: new Date('2026-08-18T00:00:00.000Z'),
    };
    campaigns.push(unpaidCampaign, inactiveCampaign, expiredCampaign);
    vouchers.push(
      {
        _id: { toString: () => '507f1f77bcf86cd799439016' },
        sourceType: 'campaign',
        campaignId: unpaidCampaign._id,
        donatedBy: ownerId,
        code: 'UNPAID-SECRET',
        isActive: false,
        isRedeemed: false,
      },
      {
        _id: { toString: () => '507f1f77bcf86cd799439017' },
        sourceType: 'campaign',
        campaignId: inactiveCampaign._id,
        donatedBy: ownerId,
        code: 'INACTIVE-SECRET',
        isActive: false,
        isRedeemed: false,
      },
      {
        _id: { toString: () => '507f1f77bcf86cd799439018' },
        sourceType: 'campaign',
        campaignId: expiredCampaign._id,
        donatedBy: ownerId,
        code: 'EXPIRED-SECRET',
        isActive: true,
        isRedeemed: false,
      },
    );

    const res = await request(createApp())
      .get('/api/vouchers')
      .set('Cookie', [`auth_token=${signAuthToken({ userId: ownerId }, '1h')}`])
      .expect(200);

    expect(res.body.data.vouchers).toEqual([]);
  });

  it('returns a claimed campaign voucher only to its claiming customer', async () => {
    const ownerId = '507f1f77bcf86cd799439099';
    const customerId = '507f1f77bcf86cd799439022';
    const campaignId = { toString: () => '507f1f77bcf86cd799439013' };
    campaigns.push({
      _id: campaignId,
      businessId: ownerId,
      status: 'completed',
      expiryDate: new Date('2026-08-18T00:00:00.000Z'),
    });
    vouchers.push({
      _id: { toString: () => '507f1f77bcf86cd799439016' },
      sourceType: 'campaign',
      campaignId,
      donatedBy: ownerId,
      redeemedBy: customerId,
      code: 'CLAIMED-CAMPAIGN-CODE',
      isActive: true,
      isRedeemed: true,
      expiryDate: new Date('2026-08-18T00:00:00.000Z'),
    });

    const bystanderResponse = await request(createApp())
      .get('/api/vouchers')
      .set('Cookie', [`auth_token=${signAuthToken({ userId: '507f1f77bcf86cd799439023' }, '1h')}`])
      .expect(200);
    const ownerResponse = await request(createApp())
      .get('/api/vouchers')
      .set('Cookie', [`auth_token=${signAuthToken({ userId: ownerId }, '1h')}`])
      .expect(200);
    const customerResponse = await request(createApp())
      .get('/api/vouchers')
      .set('Cookie', [`auth_token=${signAuthToken({ userId: customerId }, '1h')}`])
      .expect(200);

    expect(bystanderResponse.body.data.vouchers).toEqual([]);
    expect(ownerResponse.body.data.vouchers).toEqual([]);
    expect(customerResponse.body.data.vouchers).toMatchObject([{
      id: '507f1f77bcf86cd799439016',
      code: 'CLAIMED-CAMPAIGN-CODE',
      redeemedBy: customerId,
    }]);
  });

  it('rejects a stale campaign voucher claim using the atomic expiry predicate', async () => {
    vouchers.push({
      _id: { toString: () => '507f1f77bcf86cd799439012' },
      sourceType: 'campaign',
      campaignId: '507f1f77bcf86cd799439013',
      donatedBy: '507f1f77bcf86cd799439011',
      code: 'EXPIRED',
      expiryDate: new Date('2026-08-18T00:00:00.000Z'),
      isActive: true,
      isRedeemed: false,
    });
    const token = signAuthToken({ userId: '507f1f77bcf86cd799439022' }, '1h');

    await request(createApp())
      .post('/api/vouchers/507f1f77bcf86cd799439012/redeem')
      .set('Cookie', [`auth_token=${token}`])
      .expect(409);

    expect(vouchers[0].isRedeemed).toBe(false);
    const filter = vi.mocked(Voucher.findOneAndUpdate).mock.calls[0][0] as any;
    expect(filter).toMatchObject({
      isActive: true,
      isRedeemed: false,
      donatedBy: { $ne: '507f1f77bcf86cd799439022' },
      $or: expect.any(Array),
    });
  });

  it('allows only one customer to win a concurrent claim', async () => {
    vouchers.push({
      _id: { toString: () => '507f1f77bcf86cd799439012' },
      code: 'ONE-WINNER',
      donatedBy: '507f1f77bcf86cd799439011',
      expiryDate: null,
      isActive: true,
      isRedeemed: false,
    });
    const firstToken = signAuthToken({ userId: '507f1f77bcf86cd799439022' }, '1h');
    const secondToken = signAuthToken({ userId: '507f1f77bcf86cd799439023' }, '1h');

    const responses = await Promise.all([
      request(createApp())
        .post('/api/vouchers/507f1f77bcf86cd799439012/redeem')
        .set('Cookie', [`auth_token=${firstToken}`]),
      request(createApp())
        .post('/api/vouchers/507f1f77bcf86cd799439012/redeem')
        .set('Cookie', [`auth_token=${secondToken}`]),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(vouchers[0].isRedeemed).toBe(true);
  });

  it('keeps the voucher claim successful when the redemption history side write fails', async () => {
    const voucher: any = {
      _id: { toString: () => '507f1f77bcf86cd799439012' },
      code: 'SIDE-WRITE',
      donatedBy: '507f1f77bcf86cd799439011',
      expiryDate: null,
      isActive: true,
      isRedeemed: false,
    };
    vouchers.push(voucher);
    const token = signAuthToken({ userId: '507f1f77bcf86cd799439022' }, '1h');
    const { RedeemedVoucher } = await import('../models/RedeemedVoucher.js');
    vi.mocked(RedeemedVoucher.create).mockRejectedValueOnce(new Error('history unavailable'));

    await request(createApp())
      .post('/api/vouchers/507f1f77bcf86cd799439012/redeem')
      .set('Cookie', [`auth_token=${token}`])
      .expect(200);

    expect(voucher.isRedeemed).toBe(true);
    expect(voucher.redeemedBy).toBe('507f1f77bcf86cd799439022');
  });

  it('completes a campaign after its final unredeemed voucher is claimed', async () => {
    const campaign = { _id: { toString: () => '507f1f77bcf86cd799439013' }, status: 'active' };
    campaigns.push(campaign);
    const voucher = {
      _id: { toString: () => '507f1f77bcf86cd799439012' },
      sourceType: 'campaign',
      campaignId: campaign._id,
      code: 'FINAL',
      donatedBy: '507f1f77bcf86cd799439011',
      expiryDate: new Date('2026-09-01T00:00:00.000Z'),
      isActive: true,
      isRedeemed: false,
    };
    vouchers.push(voucher);
    const token = signAuthToken({ userId: '507f1f77bcf86cd799439022' }, '1h');

    await request(createApp())
      .post('/api/vouchers/507f1f77bcf86cd799439012/redeem')
      .set('Cookie', [`auth_token=${token}`])
      .expect(200);

    expect(campaign.status).toBe('completed');
    expect(Campaign.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: campaign._id, status: 'active' },
      { $set: { status: 'completed' } },
    );
  });
});

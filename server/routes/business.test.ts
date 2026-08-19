import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { signAuthToken } from '../lib/token.js';
import { withTransaction } from '../lib/transaction.js';
import { Campaign } from '../models/Campaign.js';
import { Voucher } from '../models/Voucher.js';

const businessId = '507f1f77bcf86cd799439011';
const otherBusinessId = '507f1f77bcf86cd799439099';
const profileId = '507f1f77bcf86cd799439012';
const campaignId = '507f1f77bcf86cd799439013';
const session = { id: 'transaction-session' };
const campaigns: Record<string, unknown>[] = [];
const vouchers: Record<string, unknown>[] = [];

const chain = (value: unknown) => {
  const query = {
    sort: () => query,
    lean: async () => value,
  };
  return query;
};

vi.mock('../lib/db', () => ({ connectDb: vi.fn(async () => undefined) }));
vi.mock('../lib/transaction', () => ({
  withTransaction: vi.fn(async (work: (currentSession: object) => Promise<unknown>) => {
    const original = [...vouchers];
    try {
      return await work(session);
    } catch (error) {
      vouchers.splice(0, vouchers.length, ...original);
      throw error;
    }
  }),
}));
vi.mock('../models/User', () => ({
  User: {
    findById: vi.fn(async (id: string) => ({
      _id: id,
      role: id === businessId || id === otherBusinessId ? 'business' : 'customer',
    })),
  },
}));
vi.mock('../models/BusinessProfile', () => ({
  BusinessProfile: {
    findOne: vi.fn(async () => ({ _id: profileId })),
  },
}));
vi.mock('../models/Campaign', () => ({
  Campaign: {
    find: vi.fn((query: Record<string, unknown>) => chain(campaigns.filter((campaign) => String(campaign.businessId) === String(query.businessId)))),
    findById: vi.fn(async (id: string) => campaigns.find((campaign) => String(campaign._id) === id) ?? null),
    create: vi.fn(async (doc: Record<string, unknown>) => {
      const campaign = {
        _id: { toString: () => campaignId },
        ...doc,
        createdAt: new Date('2026-08-19T00:00:00.000Z'),
        updatedAt: new Date('2026-08-19T00:00:00.000Z'),
      };
      campaigns.push(campaign);
      return campaign;
    }),
    findOneAndUpdate: vi.fn(async (query: Record<string, unknown>, update: Record<string, unknown>) => {
      const campaign = campaigns.find((item) => (
        String(item._id) === String(query._id)
        && String(item.businessId) === String(query.businessId)
        && item.status === query.status
        && (query.lockedAt === undefined || item.lockedAt === query.lockedAt)
      ));
      if (!campaign) return null;
      const changes = update.$set as Record<string, unknown> | undefined;
      Object.assign(campaign, changes ?? update);
      return campaign;
    }),
  },
}));
vi.mock('../models/Voucher', () => ({
  Voucher: {
    countDocuments: vi.fn(async (query: Record<string, unknown>) => vouchers.filter((voucher) => String(voucher.campaignId) === String(query.campaignId)).length),
    deleteMany: vi.fn(async (query: Record<string, unknown>, _options?: { session?: object }) => {
      for (let index = vouchers.length - 1; index >= 0; index -= 1) {
        if (String(vouchers[index].campaignId) === String(query.campaignId)) vouchers.splice(index, 1);
      }
      return { deletedCount: 0, query };
    }),
    create: vi.fn(async (docs: Record<string, unknown>[], _options?: { session?: object }) => {
      const created = docs.map((doc, index) => ({
        _id: { toString: () => `507f1f77bcf86cd7994390${20 + index}` },
        ...doc,
      }));
      vouchers.push(...created);
      return created;
    }),
  },
}));

const tokenFor = (id = businessId) => signAuthToken({ userId: id }, '1h');

const validCampaign = {
  title: 'Save on groceries',
  brandName: 'Fresh Market',
  description: 'A grocery offer',
  terms: 'One use per customer',
  platform: 'Google Pay',
  category: 'Shopping',
  imageUrl: 'https://example.com/campaign.png',
  expiryDate: '2026-09-01T00:00:00.000Z',
};

const seedCampaign = (overrides: Record<string, unknown> = {}) => {
  const campaign = {
    _id: { toString: () => campaignId },
    businessId,
    businessProfileId: profileId,
    ...validCampaign,
    expiryDate: new Date(validCampaign.expiryDate),
    status: 'draft',
    lockedAt: null,
    createdAt: new Date('2026-08-19T00:00:00.000Z'),
    updatedAt: new Date('2026-08-19T00:00:00.000Z'),
    ...overrides,
  };
  campaigns.push(campaign);
  return campaign;
};

describe('business routes', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    campaigns.length = 0;
    vouchers.length = 0;
    vi.clearAllMocks();
  });

  it('requires a business role for every business operation', async () => {
    await request(createApp()).get('/api/business/campaigns').expect(401);

    await request(createApp())
      .get('/api/business/campaigns')
      .set('Cookie', [`auth_token=${signAuthToken({ userId: '507f1f77bcf86cd799439022' }, '1h')}`])
      .expect(403);
  });

  it('creates and lists owned draft campaigns with nullable workspace fields', async () => {
    const createResponse = await request(createApp())
      .post('/api/business/campaigns')
      .set('Cookie', [`auth_token=${tokenFor()}`])
      .send(validCampaign)
      .expect(201);

    expect(createResponse.body.data.campaign).toMatchObject({
      id: campaignId,
      businessId,
      status: 'draft',
      inventoryCount: 0,
      invoice: null,
      analytics: null,
    });

    const listResponse = await request(createApp())
      .get('/api/business/campaigns')
      .set('Cookie', [`auth_token=${tokenFor()}`])
      .expect(200);

    expect(listResponse.body.data.campaigns).toHaveLength(1);
    expect(Campaign.find).toHaveBeenCalledWith({ businessId });
  });

  it('returns 404 before 403 for missing and non-owned campaigns', async () => {
    await request(createApp())
      .get(`/api/business/campaigns/${campaignId}`)
      .set('Cookie', [`auth_token=${tokenFor()}`])
      .expect(404);

    seedCampaign({ businessId: otherBusinessId });
    const response = await request(createApp())
      .get(`/api/business/campaigns/${campaignId}`)
      .set('Cookie', [`auth_token=${tokenFor()}`])
      .expect(403);

    expect(response.body.error).toEqual({ message: 'Forbidden' });
  });

  it('gets and updates owned draft campaigns', async () => {
    seedCampaign();

    const getResponse = await request(createApp())
      .get(`/api/business/campaigns/${campaignId}`)
      .set('Cookie', [`auth_token=${tokenFor()}`])
      .expect(200);
    expect(getResponse.body.data.campaign.inventoryCount).toBe(0);

    const updateResponse = await request(createApp())
      .patch(`/api/business/campaigns/${campaignId}`)
      .set('Cookie', [`auth_token=${tokenFor()}`])
      .send({ ...validCampaign, title: 'Updated campaign' })
      .expect(200);

    expect(updateResponse.body.data.campaign.title).toBe('Updated campaign');
    expect(Campaign.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: campaignId,
        businessId,
        status: 'draft',
        lockedAt: null,
      },
      { $set: expect.objectContaining({ title: 'Updated campaign' }) },
      { new: true, runValidators: true, session },
    );
  });

  it('rejects a stale draft update without modifying the campaign', async () => {
    const campaign = seedCampaign();
    vi.mocked(Campaign.findOneAndUpdate).mockResolvedValueOnce(null);

    await request(createApp())
      .patch(`/api/business/campaigns/${campaignId}`)
      .set('Cookie', [`auth_token=${tokenFor()}`])
      .send({ ...validCampaign, title: 'Stale update' })
      .expect(409);

    expect(campaign.title).toBe(validCampaign.title);
    expect(withTransaction).toHaveBeenCalledOnce();
  });

  it('rejects updates and inventory changes after a campaign is locked', async () => {
    seedCampaign({ status: 'awaiting_payment', lockedAt: new Date('2026-08-19T00:00:00.000Z') });

    await request(createApp())
      .patch(`/api/business/campaigns/${campaignId}`)
      .set('Cookie', [`auth_token=${tokenFor()}`])
      .send({ ...validCampaign, title: 'Too late' })
      .expect(409);

    await request(createApp())
      .post(`/api/business/campaigns/${campaignId}/inventory/preview`)
      .set('Cookie', [`auth_token=${tokenFor()}`])
      .send({ headers: ['code'], rows: [{ sourceRow: 2, code: 'SAVE10' }] })
      .expect(409);
  });

  it('previews inventory without persisting campaign vouchers', async () => {
    seedCampaign();

    const response = await request(createApp())
      .post(`/api/business/campaigns/${campaignId}/inventory/preview`)
      .set('Cookie', [`auth_token=${tokenFor()}`])
      .send({
        headers: ['code', 'value'],
        rows: [
          { sourceRow: 2, code: ' SAVE10 ', value: ' ₹10 ' },
          { sourceRow: 3, code: 'SAVE10' },
        ],
      })
      .expect(200);

    expect(response.body.data.preview).toEqual({
      accepted: [{ sourceRow: 2, code: 'SAVE10', value: '₹10' }],
      rejected: [{ sourceRow: 3, code: 'SAVE10', reason: 'Duplicate code' }],
      totalRows: 2,
    });
    expect(Voucher.deleteMany).not.toHaveBeenCalled();
    expect(Voucher.create).not.toHaveBeenCalled();
  });

  it('replaces draft inventory transactionally with one shared session and no activity writes', async () => {
    seedCampaign();
    vouchers.push({ campaignId, code: 'OLD-CODE' });

    const response = await request(createApp())
      .put(`/api/business/campaigns/${campaignId}/inventory`)
      .set('Cookie', [`auth_token=${tokenFor()}`])
      .send({ rows: [
        { sourceRow: 2, code: ' SAVE10 ', value: '₹10' },
        { sourceRow: 3, code: 'SHIPFREE' },
      ] })
      .expect(200);

    expect(response.body.data.campaign.inventoryCount).toBe(2);
    expect(Voucher.deleteMany).toHaveBeenCalledWith(
      { campaignId, sourceType: 'campaign' },
      { session },
    );
    expect(Campaign.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: campaignId,
        businessId,
        status: 'draft',
        lockedAt: null,
      },
      { $set: { updatedAt: expect.any(Date) } },
      { new: true, session },
    );
    expect(Voucher.create).toHaveBeenCalledWith([
      expect.objectContaining({
        sourceType: 'campaign',
        campaignId,
        code: 'SAVE10',
        value: '₹10',
        donatedBy: businessId,
        isActive: false,
      }),
      expect.objectContaining({
        sourceType: 'campaign',
        campaignId,
        code: 'SHIPFREE',
        donatedBy: businessId,
        isActive: false,
      }),
    ], { session });
    expect(Voucher.create).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ session: expect.not.objectContaining(session) }));
  });

  it('rejects a stale inventory replacement before deleting existing rows', async () => {
    seedCampaign();
    vouchers.push({ campaignId, code: 'OLD-CODE' });
    vi.mocked(Campaign.findOneAndUpdate).mockResolvedValueOnce(null);

    await request(createApp())
      .put(`/api/business/campaigns/${campaignId}/inventory`)
      .set('Cookie', [`auth_token=${tokenFor()}`])
      .send({ rows: [{ sourceRow: 2, code: 'SAVE10' }] })
      .expect(409);

    expect(vouchers).toEqual([{ campaignId, code: 'OLD-CODE' }]);
    expect(Voucher.deleteMany).not.toHaveBeenCalled();
  });

  it('returns safe confirmation details and leaves no partial inventory on validation failure', async () => {
    seedCampaign();
    vouchers.push({ campaignId, code: 'OLD-CODE' });

    const response = await request(createApp())
      .put(`/api/business/campaigns/${campaignId}/inventory`)
      .set('Cookie', [`auth_token=${tokenFor()}`])
      .send({ rows: [
        { sourceRow: 2, code: 'SAVE10' },
        { sourceRow: 3, code: ' SAVE10 ' },
      ] })
      .expect(400);

    expect(response.body.error).toEqual({
      message: 'Inventory contains rejected rows',
      details: { rejected: [{ sourceRow: 3, code: 'SAVE10', reason: 'Duplicate code' }] },
    });
    expect(vouchers).toEqual([{ campaignId, code: 'OLD-CODE' }]);
    expect(Voucher.deleteMany).not.toHaveBeenCalled();
  });

  it('does not expose internal error details when replacement fails after deleting', async () => {
    seedCampaign();
    vouchers.push({ campaignId, code: 'OLD-CODE' });
    vi.mocked(Voucher.create).mockRejectedValueOnce(new Error('database secret'));
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    try {
      const response = await request(createApp())
        .put(`/api/business/campaigns/${campaignId}/inventory`)
        .set('Cookie', [`auth_token=${tokenFor()}`])
        .send({ rows: [{ sourceRow: 2, code: 'SAVE10' }] })
        .expect(500);

      expect(response.body.error).toEqual({ message: 'Internal server error' });
      expect(response.body.error.details).toBeUndefined();
      expect(vouchers).toEqual([{ campaignId, code: 'OLD-CODE' }]);
    } finally {
      stderrWrite.mockRestore();
    }
  });
});

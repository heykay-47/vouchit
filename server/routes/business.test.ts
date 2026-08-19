import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { signAuthToken } from '../lib/token.js';
import { withTransaction } from '../lib/transaction.js';
import { BusinessProfile } from '../models/BusinessProfile.js';
import { Campaign } from '../models/Campaign.js';
import { Invoice } from '../models/Invoice.js';
import { Voucher } from '../models/Voucher.js';

const businessId = '507f1f77bcf86cd799439011';
const otherBusinessId = '507f1f77bcf86cd799439099';
const profileId = '507f1f77bcf86cd799439012';
const mismatchedProfileId = '507f1f77bcf86cd799439098';
const campaignId = '507f1f77bcf86cd799439013';
const invoiceId = '507f1f77bcf86cd799439030';
const session = { id: 'transaction-session' };
const campaigns: Record<string, unknown>[] = [];
const vouchers: Record<string, unknown>[] = [];
const invoices: Record<string, unknown>[] = [];
const organizationName = 'Fresh Market Ltd';
let businessProfile: Record<string, unknown> | null;
let duplicateInvoiceOnCreate = false;
let failVoucherActivation = false;

const chain = (value: unknown) => {
  const query = {
    sort: () => query,
    lean: async () => value,
  };
  return query;
};

vi.mock('../lib/db', () => ({ connectDb: vi.fn(async () => undefined) }));
vi.mock('express-rate-limit', () => ({
  default: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));
vi.mock('../lib/transaction', () => ({
  withTransaction: vi.fn(async (work: (currentSession: object) => Promise<unknown>) => {
    const snapshots = [campaigns, vouchers, invoices].map((items) => items.map((item) => ({
      item,
      values: { ...item },
    })));
    try {
      return await work(session);
    } catch (error) {
      [campaigns, vouchers, invoices].forEach((items, index) => {
        items.length = 0;
        snapshots[index].forEach(({ item, values }) => {
          Object.assign(item, values);
          items.push(item);
        });
      });
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
    findOne: vi.fn(async () => businessProfile),
  },
}));
vi.mock('../models/Campaign', () => ({
  Campaign: {
    find: vi.fn((query: Record<string, unknown>) => chain(campaigns.filter((campaign) => String(campaign.businessId) === String(query.businessId)))),
    findById: vi.fn(async (id: string) => campaigns.find((campaign) => String(campaign._id) === id) ?? null),
    findOne: vi.fn(async (query: Record<string, unknown>) => campaigns.find((campaign) => (
      String(campaign._id) === String(query._id)
      && String(campaign.businessId) === String(query.businessId)
    )) ?? null),
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
        && (query.businessProfileId === undefined || String(item.businessProfileId) === String(query.businessProfileId))
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
    updateMany: vi.fn(async (query: Record<string, unknown>, update: Record<string, unknown>) => {
      if (failVoucherActivation) {
        throw new Error('activation callback failed');
      }
      const matches = vouchers.filter((voucher) => (
        String(voucher.campaignId) === String(query.campaignId)
        && voucher.sourceType === query.sourceType
        && voucher.isActive === query.isActive
      ));
      const changes = update.$set as Record<string, unknown> | undefined;
      matches.forEach((voucher) => Object.assign(voucher, changes ?? update));
      return { matchedCount: matches.length, modifiedCount: matches.length };
    }),
  },
}));
vi.mock('../models/Invoice', () => ({
  Invoice: {
    findById: vi.fn(async (id: string) => invoices.find((invoice) => String(invoice._id) === String(id)) ?? null),
    findOne: vi.fn(async (query: Record<string, unknown>) => invoices.find((invoice) => (
      (query._id === undefined || String(invoice._id) === String(query._id))
      && (query.campaignId === undefined || String(invoice.campaignId) === String(query.campaignId))
      && (query.businessId === undefined || String(invoice.businessId) === String(query.businessId))
      && (query.externalPaymentReference === undefined || invoice.externalPaymentReference === query.externalPaymentReference)
    )) ?? null),
    findOneAndUpdate: vi.fn(async (query: Record<string, unknown>, update: Record<string, unknown>) => {
      const invoice = invoices.find((item) => (
        (query._id === undefined || String(item._id) === String(query._id))
        && (query.businessId === undefined || String(item.businessId) === String(query.businessId))
        && (query.status === undefined || item.status === query.status)
      ));
      if (!invoice) return null;
      const changes = update.$set as Record<string, unknown> | undefined;
      const reference = changes?.externalPaymentReference;
      if (reference !== undefined && invoices.some((item) => (
        item !== invoice
        && item.businessId === invoice.businessId
        && item.externalPaymentReference === reference
      ))) {
        const error = Object.assign(new Error('duplicate reference'), { code: 11000 });
        throw error;
      }
      Object.assign(invoice, changes ?? update);
      return invoice;
    }),
    create: vi.fn(async (docs: Record<string, unknown>[]) => {
      if (duplicateInvoiceOnCreate) {
        const error = Object.assign(new Error('duplicate invoice'), { code: 11000 });
        throw error;
      }

      const created = docs.map((doc) => ({
        _id: { toString: () => '507f1f77bcf86cd799439030' },
        issuedAt: new Date('2026-08-19T00:00:00.000Z'),
        status: 'issued',
        ...doc,
      }));
      invoices.push(...created);
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

const seedIssuedInvoice = (overrides: Record<string, unknown> = {}) => {
  const campaign = seedCampaign({
    status: 'awaiting_payment',
    lockedAt: new Date('2026-08-19T00:01:00.000Z'),
  });
  const invoice = {
    _id: { toString: () => '507f1f77bcf86cd799439030' },
    campaignId,
    businessId,
    priceVersion: 'v1',
    currency: 'INR',
    baseFeePaise: 9900,
    perVoucherFeePaise: 200,
    quantity: 1,
    totalPaise: 10100,
    status: 'issued',
    issuedAt: new Date('2026-08-19T00:00:00.000Z'),
    paidAt: null,
    externalPaymentReference: null,
    externalPaymentDate: null,
    ...overrides,
  };
  invoices.push(invoice);
  return { campaign, invoice };
};

describe('business routes', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    campaigns.length = 0;
    vouchers.length = 0;
    invoices.length = 0;
    duplicateInvoiceOnCreate = false;
    failVoucherActivation = false;
    businessProfile = { _id: profileId, userId: businessId, organizationName };
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
      organizationName,
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
    expect(listResponse.body.data.campaigns[0].organizationName).toBe(organizationName);
    expect(Campaign.find).toHaveBeenCalledWith({ businessId });
  });

  it('uses one bounded profile lookup when listing multiple campaigns', async () => {
    seedCampaign();
    seedCampaign({ _id: { toString: () => '507f1f77bcf86cd799439014' } });

    const response = await request(createApp())
      .get('/api/business/campaigns')
      .set('Cookie', [`auth_token=${tokenFor()}`])
      .expect(200);

    expect(response.body.data.campaigns).toHaveLength(2);
    expect(response.body.data.campaigns.map((campaign: { organizationName: string }) => campaign.organizationName))
      .toEqual([organizationName, organizationName]);
    expect(BusinessProfile.findOne).toHaveBeenCalledOnce();
    expect(BusinessProfile.findOne).toHaveBeenCalledWith({ userId: businessId });
  });

  it('returns a safe error when an owned campaign has no business profile', async () => {
    seedCampaign();
    businessProfile = null;

    const response = await request(createApp())
      .get(`/api/business/campaigns/${campaignId}`)
      .set('Cookie', [`auth_token=${tokenFor()}`])
      .expect(404);

    expect(response.body.error).toEqual({ message: 'Business profile not found' });
  });

  it('does not mutate an owned campaign when its business profile is missing', async () => {
    const campaign = seedCampaign();
    businessProfile = null;

    const response = await request(createApp())
      .patch(`/api/business/campaigns/${campaignId}`)
      .set('Cookie', [`auth_token=${tokenFor()}`])
      .send({ ...validCampaign, title: 'Unsafe update' })
      .expect(404);

    expect(response.body.error).toEqual({ message: 'Business profile not found' });
    expect(campaign.title).toBe(validCampaign.title);
    expect(Campaign.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('does not patch an owned campaign when its business profile id is mismatched', async () => {
    const campaign = seedCampaign();
    businessProfile = { _id: mismatchedProfileId, userId: businessId, organizationName };

    const response = await request(createApp())
      .patch(`/api/business/campaigns/${campaignId}`)
      .set('Cookie', [`auth_token=${tokenFor()}`])
      .send({ ...validCampaign, title: 'Unsafe update' })
      .expect(404);

    expect(response.body.error).toEqual({ message: 'Business profile not found' });
    expect(campaign.title).toBe(validCampaign.title);
    expect(withTransaction).not.toHaveBeenCalled();
    expect(Campaign.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rechecks the owning profile inside the patch transaction before mutation', async () => {
    seedCampaign();
    vi.mocked(BusinessProfile.findOne)
      .mockResolvedValueOnce(businessProfile)
      .mockResolvedValueOnce({
        _id: mismatchedProfileId,
        userId: businessId,
        organizationName,
      });

    const response = await request(createApp())
      .patch(`/api/business/campaigns/${campaignId}`)
      .set('Cookie', [`auth_token=${tokenFor()}`])
      .send({ ...validCampaign, title: 'Raced update' })
      .expect(404);

    expect(response.body.error).toEqual({ message: 'Business profile not found' });
    expect(withTransaction).toHaveBeenCalledOnce();
    expect(BusinessProfile.findOne).toHaveBeenNthCalledWith(
      2,
      { userId: businessId, _id: profileId },
      null,
      { session },
    );
    expect(Campaign.findOneAndUpdate).not.toHaveBeenCalled();
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
    expect(getResponse.body.data.campaign.organizationName).toBe(organizationName);

    const updateResponse = await request(createApp())
      .patch(`/api/business/campaigns/${campaignId}`)
      .set('Cookie', [`auth_token=${tokenFor()}`])
      .send({ ...validCampaign, title: 'Updated campaign' })
      .expect(200);

    expect(updateResponse.body.data.campaign.title).toBe('Updated campaign');
    expect(updateResponse.body.data.campaign.organizationName).toBe(organizationName);
    expect(Campaign.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: campaignId,
        businessId,
        businessProfileId: profileId,
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
    expect(response.body.data.campaign.organizationName).toBe(organizationName);
    expect(Voucher.deleteMany).toHaveBeenCalledWith(
      { campaignId, sourceType: 'campaign' },
      { session },
    );
    expect(Campaign.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: campaignId,
        businessId,
        businessProfileId: profileId,
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

  it('does not replace inventory when the business profile id is mismatched', async () => {
    seedCampaign();
    vouchers.push({ campaignId, code: 'OLD-CODE' });
    businessProfile = { _id: mismatchedProfileId, userId: businessId, organizationName };

    const response = await request(createApp())
      .put(`/api/business/campaigns/${campaignId}/inventory`)
      .set('Cookie', [`auth_token=${tokenFor()}`])
      .send({ rows: [{ sourceRow: 2, code: 'SAVE10' }] })
      .expect(404);

    expect(response.body.error).toEqual({ message: 'Business profile not found' });
    expect(vouchers).toEqual([{ campaignId, code: 'OLD-CODE' }]);
    expect(withTransaction).not.toHaveBeenCalled();
    expect(Campaign.findOneAndUpdate).not.toHaveBeenCalled();
    expect(Voucher.deleteMany).not.toHaveBeenCalled();
    expect(Voucher.create).not.toHaveBeenCalled();
  });

  it('rechecks the owning profile inside the inventory transaction before mutation', async () => {
    seedCampaign();
    vouchers.push({ campaignId, code: 'OLD-CODE' });
    vi.mocked(BusinessProfile.findOne)
      .mockResolvedValueOnce(businessProfile)
      .mockResolvedValueOnce({
        _id: mismatchedProfileId,
        userId: businessId,
        organizationName,
      });

    const response = await request(createApp())
      .put(`/api/business/campaigns/${campaignId}/inventory`)
      .set('Cookie', [`auth_token=${tokenFor()}`])
      .send({ rows: [{ sourceRow: 2, code: 'SAVE10' }] })
      .expect(404);

    expect(response.body.error).toEqual({ message: 'Business profile not found' });
    expect(vouchers).toEqual([{ campaignId, code: 'OLD-CODE' }]);
    expect(withTransaction).toHaveBeenCalledOnce();
    expect(BusinessProfile.findOne).toHaveBeenNthCalledWith(
      2,
      { userId: businessId, _id: profileId },
      null,
      { session },
    );
    expect(Campaign.findOneAndUpdate).not.toHaveBeenCalled();
    expect(Voucher.deleteMany).not.toHaveBeenCalled();
    expect(Voucher.create).not.toHaveBeenCalled();
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

  it('rejects invoice issuance for an owned campaign without persisted inventory', async () => {
    seedCampaign();

    const response = await request(createApp())
      .post(`/api/business/campaigns/${campaignId}/invoice`)
      .set('Cookie', [`auth_token=${tokenFor()}`])
      .expect(409);

    expect(response.body.error).toEqual({ message: 'Campaign inventory is required' });
    expect(invoices).toHaveLength(0);
    expect(Campaign.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects invoice issuance for a campaign owned by another business', async () => {
    seedCampaign({ businessId: otherBusinessId });

    await request(createApp())
      .post(`/api/business/campaigns/${campaignId}/invoice`)
      .set('Cookie', [`auth_token=${tokenFor()}`])
      .expect(403);

    expect(invoices).toHaveLength(0);
    expect(withTransaction).not.toHaveBeenCalled();
  });

  it('issues an immutable inventory snapshot and locks the campaign', async () => {
    const campaign = seedCampaign();
    vouchers.push(
      { campaignId, sourceType: 'campaign', code: 'SAVE10' },
      { campaignId, sourceType: 'campaign', code: 'SHIPFREE' },
      { campaignId, sourceType: 'campaign', code: 'WELCOME' },
    );

    const response = await request(createApp())
      .post(`/api/business/campaigns/${campaignId}/invoice`)
      .set('Cookie', [`auth_token=${tokenFor()}`])
      .expect(201);

    expect(response.body.data.invoice).toMatchObject({
      id: '507f1f77bcf86cd799439030',
      campaignId,
      businessId,
      priceVersion: 'v1',
      currency: 'INR',
      baseFeePaise: 9900,
      perVoucherFeePaise: 200,
      quantity: 3,
      totalPaise: 10500,
      status: 'issued',
    });
    expect(Campaign.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: campaignId, businessId, status: 'draft', lockedAt: null },
      { $set: { status: 'awaiting_payment', lockedAt: expect.any(Date) } },
      { new: true, session },
    );
    expect(campaign.status).toBe('awaiting_payment');
    expect(campaign.lockedAt).toBeInstanceOf(Date);
    expect(Invoice.create).toHaveBeenCalledWith([
      expect.objectContaining({ campaignId, businessId, quantity: 3, totalPaise: 10500 }),
    ], { session });
  });

  it('returns the same invoice when issuance is repeated after locking', async () => {
    seedCampaign();
    vouchers.push({ campaignId, sourceType: 'campaign', code: 'SAVE10' });

    const first = await request(createApp())
      .post(`/api/business/campaigns/${campaignId}/invoice`)
      .set('Cookie', [`auth_token=${tokenFor()}`])
      .expect(201);
    const second = await request(createApp())
      .post(`/api/business/campaigns/${campaignId}/invoice`)
      .set('Cookie', [`auth_token=${tokenFor()}`])
      .expect(200);

    expect(second.body.data.invoice).toEqual(first.body.data.invoice);
    expect(Invoice.create).toHaveBeenCalledOnce();
    expect(Campaign.findOneAndUpdate).toHaveBeenCalledOnce();
  });

  it('returns the winning invoice after a concurrent duplicate campaign insert', async () => {
    seedCampaign({ status: 'draft', lockedAt: null });
    vouchers.push({ campaignId, sourceType: 'campaign', code: 'SAVE10' });
    const winner = {
      _id: { toString: () => '507f1f77bcf86cd799439031' },
      campaignId,
      businessId,
      priceVersion: 'v1',
      currency: 'INR',
      baseFeePaise: 9900,
      perVoucherFeePaise: 200,
      quantity: 1,
      totalPaise: 10100,
      status: 'issued',
      issuedAt: new Date('2026-08-19T00:00:00.000Z'),
    };
    duplicateInvoiceOnCreate = true;
    vi.mocked(Invoice.findOne)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(winner as never);

    const response = await request(createApp())
      .post(`/api/business/campaigns/${campaignId}/invoice`)
      .set('Cookie', [`auth_token=${tokenFor()}`])
      .expect(200);

    expect(response.body.data.invoice.id).toBe('507f1f77bcf86cd799439031');
    expect(response.body.data.invoice.totalPaise).toBe(10100);
    expect(campaigns[0].status).toBe('draft');
    expect(Campaign.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('activates the invoice, campaign, and inventory in one transaction', async () => {
    const { campaign, invoice } = seedIssuedInvoice();
    vouchers.push({ campaignId, sourceType: 'campaign', code: 'SAVE10', isActive: false });

    const response = await request(createApp())
      .post(`/api/business/invoices/${invoiceId}/settlement`)
      .set('Cookie', [`auth_token=${tokenFor()}`])
      .send({
        amountPaise: 10100,
        externalPaymentReference: ' BANK-001 ',
        externalPaymentDate: invoice.issuedAt.toISOString(),
      })
      .expect(200);

    expect(response.body.data.invoice).toMatchObject({
      id: invoiceId,
      status: 'paid',
      externalPaymentReference: 'BANK-001',
    });
    expect(response.body.data.campaign.status).toBe('active');
    expect(invoice.status).toBe('paid');
    expect(campaign.status).toBe('active');
    expect(vouchers[0].isActive).toBe(true);
    expect(Invoice.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: invoiceId, businessId, status: 'issued' },
      { $set: expect.objectContaining({ status: 'paid', externalPaymentReference: 'BANK-001' }) },
      { new: true, session },
    );
    expect(Campaign.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: campaignId, businessId, status: 'awaiting_payment' },
      { $set: { status: 'active' } },
      { new: true, session },
    );
    expect(Voucher.updateMany).toHaveBeenCalledWith(
      { campaignId, sourceType: 'campaign', isActive: false },
      { $set: { isActive: true } },
      { session },
    );
  });

  it('rejects a settlement with an amount mismatch before mutation', async () => {
    seedIssuedInvoice();

    const response = await request(createApp())
      .post(`/api/business/invoices/${invoiceId}/settlement`)
      .set('Cookie', [`auth_token=${tokenFor()}`])
      .send({
        amountPaise: 10099,
        externalPaymentReference: 'BANK-001',
        externalPaymentDate: '2026-08-19T00:00:00.000Z',
      })
      .expect(409);

    expect(response.body.error).toEqual({ message: 'Settlement amount does not match invoice total' });
    expect(withTransaction).not.toHaveBeenCalled();
    expect(invoices[0].status).toBe('issued');
  });

  it('requires a trimmed non-empty settlement reference and an in-range payment date', async () => {
    seedIssuedInvoice();

    await request(createApp())
      .post(`/api/business/invoices/${invoiceId}/settlement`)
      .set('Cookie', [`auth_token=${tokenFor()}`])
      .send({
        amountPaise: 10100,
        externalPaymentReference: '   ',
        externalPaymentDate: '2026-08-19T00:00:00.000Z',
      })
      .expect(400);

    await request(createApp())
      .post(`/api/business/invoices/${invoiceId}/settlement`)
      .set('Cookie', [`auth_token=${tokenFor()}`])
      .send({
        amountPaise: 10100,
        externalPaymentReference: 'BANK-001',
        externalPaymentDate: '2026-08-18T23:59:59.999Z',
      })
      .expect(409);

    await request(createApp())
      .post(`/api/business/invoices/${invoiceId}/settlement`)
      .set('Cookie', [`auth_token=${tokenFor()}`])
      .send({
        amountPaise: 10100,
        externalPaymentReference: 'BANK-001',
        externalPaymentDate: new Date(Date.now() + 60_000).toISOString(),
      })
      .expect(409);
  });

  it('rejects settlement by a different business', async () => {
    seedIssuedInvoice({ businessId: otherBusinessId });

    const response = await request(createApp())
      .post(`/api/business/invoices/${invoiceId}/settlement`)
      .set('Cookie', [`auth_token=${tokenFor()}`])
      .send({
        amountPaise: 10100,
        externalPaymentReference: 'BANK-001',
        externalPaymentDate: '2026-08-19T00:00:00.000Z',
      })
      .expect(403);

    expect(response.body.error).toEqual({ message: 'Forbidden' });
    expect(withTransaction).not.toHaveBeenCalled();
  });

  it('maps a duplicate external payment reference to 409', async () => {
    seedIssuedInvoice();
    invoices.push({
      _id: { toString: () => '507f1f77bcf86cd799439031' },
      campaignId: '507f1f77bcf86cd799439014',
      businessId,
      externalPaymentReference: 'BANK-001',
      status: 'paid',
    });

    await request(createApp())
      .post(`/api/business/invoices/${invoiceId}/settlement`)
      .set('Cookie', [`auth_token=${tokenFor()}`])
      .send({
        amountPaise: 10100,
        externalPaymentReference: 'BANK-001',
        externalPaymentDate: '2026-08-19T00:00:00.000Z',
      })
      .expect(409);

    expect(invoices[0].status).toBe('issued');
  });

  it('returns identical metadata for an already-paid invoice', async () => {
    const { invoice } = seedIssuedInvoice();
    vouchers.push({ campaignId, sourceType: 'campaign', code: 'SAVE10', isActive: false });
    const input = {
      amountPaise: 10100,
      externalPaymentReference: 'BANK-001',
      externalPaymentDate: invoice.issuedAt.toISOString(),
    };

    const first = await request(createApp())
      .post(`/api/business/invoices/${invoiceId}/settlement`)
      .set('Cookie', [`auth_token=${tokenFor()}`])
      .send(input)
      .expect(200);
    const second = await request(createApp())
      .post(`/api/business/invoices/${invoiceId}/settlement`)
      .set('Cookie', [`auth_token=${tokenFor()}`])
      .send(input)
      .expect(200);

    expect(second.body.data).toEqual(first.body.data);
    expect(Invoice.findOneAndUpdate).toHaveBeenCalledOnce();
    expect(Campaign.findOneAndUpdate).toHaveBeenCalledOnce();
    expect(Voucher.updateMany).toHaveBeenCalledOnce();
  });

  it('rejects conflicting metadata for an already-paid invoice', async () => {
    const { invoice } = seedIssuedInvoice();
    vouchers.push({ campaignId, sourceType: 'campaign', code: 'SAVE10', isActive: false });
    const input = {
      amountPaise: 10100,
      externalPaymentReference: 'BANK-001',
      externalPaymentDate: invoice.issuedAt.toISOString(),
    };

    await request(createApp())
      .post(`/api/business/invoices/${invoiceId}/settlement`)
      .set('Cookie', [`auth_token=${tokenFor()}`])
      .send(input)
      .expect(200);

    const response = await request(createApp())
      .post(`/api/business/invoices/${invoiceId}/settlement`)
      .set('Cookie', [`auth_token=${tokenFor()}`])
      .send({ ...input, externalPaymentReference: 'BANK-002' })
      .expect(409);

    expect(response.body.error).toEqual({ message: 'Settlement conflicts with existing payment' });
    expect(Invoice.findOneAndUpdate).toHaveBeenCalledOnce();
    expect(vouchers[0].isActive).toBe(true);
  });

  it('rolls back invoice and campaign activation when voucher activation fails', async () => {
    const { campaign, invoice } = seedIssuedInvoice();
    vouchers.push({ campaignId, sourceType: 'campaign', code: 'SAVE10', isActive: false });
    failVoucherActivation = true;
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    try {
      await request(createApp())
        .post(`/api/business/invoices/${invoiceId}/settlement`)
        .set('Cookie', [`auth_token=${tokenFor()}`])
        .send({
          amountPaise: 10100,
          externalPaymentReference: 'BANK-001',
          externalPaymentDate: invoice.issuedAt.toISOString(),
        })
        .expect(500);
    } finally {
      stderrWrite.mockRestore();
    }

    expect(invoice.status).toBe('issued');
    expect(campaign.status).toBe('awaiting_payment');
    expect(vouchers[0].isActive).toBe(false);
  });
});

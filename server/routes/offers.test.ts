import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';
import { buildViewerClaimStages } from '../lib/offer-query.js';
import { signAuthToken } from '../lib/token.js';
import { Campaign } from '../models/Campaign.js';
import { RedeemedVoucher } from '../models/RedeemedVoucher.js';
import { User } from '../models/User.js';
import { Voucher } from '../models/Voucher.js';

const customerId = '507f1f77bcf86cd799439022';
const otherCustomerId = '507f1f77bcf86cd799439023';
const businessId = '507f1f77bcf86cd799439011';
const campaignId = '507f1f77bcf86cd799439013';
const unknownCampaignId = '507f1f77bcf86cd799439099';
const voucherId1 = '507f1f77bcf86cd799439031';
const voucherId2 = '507f1f77bcf86cd799439032';
process.env.JWT_SECRET = 'test-secret';
const customerToken = signAuthToken({ userId: customerId }, '1h');
const businessToken = signAuthToken({ userId: businessId }, '1h');

type TestSession = { id: string; undo: Array<() => void> };
type TestDocument = Record<string, unknown> & { _id: string };
type TestFilter = Record<string, unknown>;

const viewerState = vi.hoisted(() => ({
  users: {
    '507f1f77bcf86cd799439022': { role: 'customer' },
    '507f1f77bcf86cd799439023': { role: 'customer' },
    '507f1f77bcf86cd799439011': { role: 'business' },
  } as Record<string, { role: string }>,
}));

const offerState = vi.hoisted(() => ({
  pipeline: [] as Record<string, unknown>[],
  rows: [] as Record<string, unknown>[],
}));

const claimState = vi.hoisted(() => {
  const sameId = (left: unknown, right: unknown) => left?.toString() === right?.toString();
  const matches = (document: TestDocument, filter: TestFilter): boolean => (
    Object.entries(filter).every(([key, value]) => {
      if (value && typeof value === 'object' && '$gt' in value) {
        return document[key] instanceof Date
          && value.$gt instanceof Date
          && document[key] > value.$gt;
      }
      return sameId(document[key], value) || document[key] === value;
    })
  );
  const updateWithUndo = (
    document: Record<string, unknown>,
    changes: Record<string, unknown>,
    session: TestSession,
  ) => {
    const before = { ...document };
    session.undo.push(() => {
      Object.keys(document).forEach((key) => delete document[key]);
      Object.assign(document, before);
    });
    Object.assign(document, changes);
  };

  return {
    campaigns: [] as TestDocument[],
    vouchers: [] as TestDocument[],
    priorClaimBarrier: null as (() => Promise<null>) | null,
    sessionSequence: 0,
    matches,
    updateWithUndo,
  };
});

const makeCampaign = (overrides: Record<string, unknown> = {}) => ({
  _id: campaignId,
  businessProfileId: '507f1f77bcf86cd799439014',
  title: 'Campaign reward',
  brandName: 'Fresh Rewards',
  description: 'Campaign description',
  platform: 'Google Pay',
  category: 'Shopping',
  imageUrl: 'https://example.com/campaign.png',
  status: 'active',
  expiryDate: new Date(Date.now() + 60_000),
  ...overrides,
});
const makeCampaignVoucher = (overrides: Record<string, unknown> = {}) => ({
  _id: voucherId1,
  campaignId,
  sourceType: 'campaign',
  code: 'CAMPAIGN-CODE',
  isActive: true,
  isRedeemed: false,
  redeemedBy: null,
  expiryDate: new Date(Date.now() + 60_000),
  viewCount: 0,
  ...overrides,
});
const claim = (id: string, token: string) => request(createApp())
  .post(`/api/offers/campaign/${id}/claim`)
  .set('Cookie', [`auth_token=${token}`]);
const view = (id: string) => request(createApp())
  .post(`/api/offers/campaign/${id}/view`);

const arrangeViewState = (state: 'missing' | 'completed' | 'expired' | 'sold-out') => {
  if (state === 'missing') return;
  claimState.campaigns.push(makeCampaign({
    status: state === 'completed' ? 'completed' : 'active',
    expiryDate: state === 'expired'
      ? new Date(Date.now() - 60_000)
      : new Date(Date.now() + 60_000),
  }));
  if (state !== 'sold-out') {
    claimState.vouchers.push(makeCampaignVoucher());
  }
};

const communityAggregateRow = {
  _id: { toString: () => '507f1f77bcf86cd799439011' },
  kind: 'community',
  title: 'Community reward',
  description: 'Shared by a customer',
  platform: 'Google Pay',
  imageUrl: 'https://example.com/community.png',
  expiryDate: new Date('2026-09-01T00:00:00.000Z'),
  donatedAt: new Date('2026-08-23T00:00:00.000Z'),
  missingExpiry: 0,
};
const campaignAggregateRow = {
  _id: { toString: () => '507f1f77bcf86cd799439012' },
  kind: 'campaign',
  title: 'Business reward',
  description: 'Published inventory',
  terms: 'One per customer',
  platform: 'Google Pay',
  category: 'Shopping',
  imageUrl: 'https://example.com/campaign.png',
  expiryDate: new Date('2026-09-02T00:00:00.000Z'),
  brandName: 'Fresh Rewards',
  organizationName: 'Fresh Market Ltd',
  remainingCount: 3,
  missingExpiry: 0,
  code: 'SECRET-CODE',
  voucherId: 'inventory-voucher-id',
};

vi.mock('../lib/db', () => ({ connectDb: vi.fn(async () => undefined) }));
vi.mock('express-rate-limit', () => ({
  default: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));
vi.mock('../lib/transaction', () => ({
  withTransaction: vi.fn(async (work: (session: TestSession) => Promise<unknown>) => {
    const currentSession: TestSession = {
      id: `offer-session-${++claimState.sessionSequence}`,
      undo: [],
    };
    try {
      return await work(currentSession);
    } catch (error) {
      currentSession.undo.reverse().forEach((undo) => undo());
      throw error;
    }
  }),
}));
vi.mock('../models/Voucher', () => ({
  Voucher: {
    aggregate: vi.fn(async (pipeline: Record<string, unknown>[]) => {
      offerState.pipeline = pipeline;
      return [{
        metadata: [{ total: offerState.rows.length }],
        page: offerState.rows,
      }];
    }),
    findOne: vi.fn(async (filter: TestFilter) => {
      if ('redeemedBy' in filter && claimState.priorClaimBarrier) {
        await claimState.priorClaimBarrier();
      }
      return claimState.vouchers.find((voucher) => claimState.matches(voucher, filter)) ?? null;
    }),
    findOneAndUpdate: vi.fn(async (
      filter: TestFilter,
      update: { $inc?: Record<string, number>; $set?: Record<string, unknown> },
      options: { session?: TestSession },
    ) => {
      const voucher = claimState.vouchers
        .filter((candidate) => claimState.matches(candidate, filter))
        .sort((left, right) => left._id.toString().localeCompare(right._id.toString()))[0];
      if (!voucher) return null;
      if (update.$inc) {
        Object.entries(update.$inc).forEach(([key, amount]) => {
          voucher[key] = Number(voucher[key] ?? 0) + amount;
        });
      } else if (options.session) {
        claimState.updateWithUndo(voucher, update.$set ?? update, options.session);
      }
      return voucher;
    }),
  },
}));

vi.mock('../models/Campaign', () => ({
  Campaign: {
    exists: vi.fn(async (filter: TestFilter) => (
      claimState.campaigns.some((campaign) => claimState.matches(campaign, filter))
    )),
    findOne: vi.fn(async (filter: TestFilter) => (
      claimState.campaigns.find((campaign) => claimState.matches(campaign, filter)) ?? null
    )),
    findOneAndUpdate: vi.fn(async (
      filter: TestFilter,
      update: { $set?: Record<string, unknown> },
      options: { session: TestSession },
    ) => {
      const campaign = claimState.campaigns.find((candidate) => claimState.matches(candidate, filter));
      if (!campaign) return null;
      claimState.updateWithUndo(campaign, update.$set ?? update, options.session);
      return campaign;
    }),
  },
}));

vi.mock('../models/BusinessProfile', () => ({
  BusinessProfile: {
    findOne: vi.fn(async () => ({ organizationName: 'Fresh Market Ltd' })),
  },
}));

vi.mock('../models/RedeemedVoucher', () => ({
  RedeemedVoucher: {
    create: vi.fn(async (documents: unknown[]) => documents),
  },
}));

vi.mock('../models/User', () => ({
  User: {
    findById: vi.fn((id: string) => {
      const user = viewerState.users[id] ?? null;
      return {
        select: vi.fn(() => ({ lean: vi.fn(async () => user) })),
        then: (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) => (
          Promise.resolve(user).then(resolve, reject)
        ),
      };
    }),
  },
}));

const lastPipeline = () => offerState.pipeline;

describe('offer routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    offerState.pipeline = [];
    offerState.rows = [];
    claimState.campaigns.length = 0;
    claimState.vouchers.length = 0;
    claimState.priorClaimBarrier = null;
    claimState.sessionSequence = 0;
    vi.mocked(RedeemedVoucher.create).mockImplementation(async (documents) => documents);
  });

  it('returns community vouchers and one grouped campaign offer without secrets', async () => {
    offerState.rows.push(
      communityAggregateRow,
      { ...campaignAggregateRow, remainingCount: 3 },
    );

    const response = await request(createApp()).get('/api/offers').expect(200);

    expect(response.body.data).toMatchObject({
      total: 2,
      hasMore: false,
      nextCursor: null,
      offers: [
        expect.objectContaining({ kind: 'community' }),
        expect.objectContaining({ kind: 'campaign', remainingCount: 3 }),
      ],
    });
    expect(JSON.stringify(response.body)).not.toContain('SECRET-CODE');
    expect(JSON.stringify(response.body)).not.toContain('inventory-voucher-id');
    expect(lastPipeline().at(-1)).toEqual({
      $facet: {
        metadata: [{ $count: 'total' }],
        page: [
          { $sort: { missingExpiry: 1, expiryDate: 1, kind: 1, _id: 1 } },
          { $limit: 25 },
        ],
      },
    });
  });

  it('resolves an authenticated customer role and captures the exact claim exclusion stages', async () => {
    const response = await request(createApp())
      .get('/api/offers?source=campaign')
      .set('Cookie', [`auth_token=${signAuthToken({ userId: customerId }, '1h')}`])
      .expect(200);

    expect(response.body.data.offers).toEqual([]);
    expect(User.findById).toHaveBeenCalledWith(customerId);

    const claimStages = buildViewerClaimStages({ viewerId: customerId, viewerRole: 'customer' });
    const claimIndex = lastPipeline().findIndex((stage) => '$lookup' in stage);
    expect(lastPipeline().slice(claimIndex, claimIndex + claimStages.length)).toEqual(claimStages);
  });

  it('keeps an active campaign visible to anonymous and business viewers', async () => {
    offerState.rows.push(campaignAggregateRow);

    const anonymousResponse = await request(createApp()).get('/api/offers').expect(200);
    expect(anonymousResponse.body.data.offers).toHaveLength(1);
    expect(User.findById).not.toHaveBeenCalled();
    expect(lastPipeline()).not.toContainEqual({ $match: { viewerClaimed: false } });

    const businessResponse = await request(createApp())
      .get('/api/offers')
      .set('Cookie', [`auth_token=${signAuthToken({ userId: businessId }, '1h')}`])
      .expect(200);
    expect(businessResponse.body.data.offers).toHaveLength(1);
    expect(User.findById).toHaveBeenCalledWith(businessId);
    expect(lastPipeline()).not.toContainEqual({ $match: { viewerClaimed: false } });
  });

  it('rejects a malformed cursor before executing the aggregate', async () => {
    const response = await request(createApp())
      .get('/api/offers?cursor=not-a-cursor')
      .expect(400);

    expect(response.body.error.message).toBe('Invalid offer cursor');
    expect(lastPipeline()).toEqual([]);
  });

  it('rejects an explicitly empty cursor before executing the aggregate', async () => {
    const response = await request(createApp())
      .get('/api/offers?cursor=')
      .expect(400);

    expect(response.body.error.message).toBe('Invalid offer cursor');
    expect(lastPipeline()).toEqual([]);
  });

  it('records a grouped campaign view on one stable eligible voucher', async () => {
    claimState.campaigns.push(makeCampaign());
    claimState.vouchers.push(
      makeCampaignVoucher({ _id: voucherId2, viewCount: 2 }),
      makeCampaignVoucher({ _id: voucherId1, viewCount: 4 }),
    );

    const response = await view(campaignId).expect(200);

    expect(response.body).toEqual({ data: { recorded: true }, error: null });
    expect(JSON.stringify(response.body)).not.toMatch(/code|voucherId|campaignId/);
    expect(claimState.vouchers).toMatchObject([
      { _id: voucherId2, viewCount: 2 },
      { _id: voucherId1, viewCount: 5 },
    ]);
    expect(Voucher.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignId,
        sourceType: 'campaign',
        isActive: true,
        isRedeemed: false,
        expiryDate: { $gt: expect.any(Date) },
      }),
      { $inc: { viewCount: 1 } },
      { new: true, sort: { _id: 1 } },
    );
  });

  it('returns 400 for a malformed campaign view id', async () => {
    const response = await view('not-an-id').expect(400);

    expect(response.body.error.message).toBe('Invalid campaign id');
    expect(Campaign.exists).not.toHaveBeenCalled();
    expect(Voucher.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it.each(['missing', 'completed', 'expired', 'sold-out'] as const)(
    'treats %s campaign offer views as a private no-op',
    async (state) => {
      arrangeViewState(state);

      const response = await view(campaignId).expect(200);

      expect(response.body).toEqual({ data: { recorded: true }, error: null });
      expect(JSON.stringify(response.body)).not.toMatch(/code|voucherId|campaignId/);
      expect(claimState.vouchers.every((voucher) => voucher.viewCount === 0)).toBe(true);
    },
  );

  it.each([
    ['anonymous', undefined, 401],
    ['business', businessToken, 403],
  ])('rejects %s campaign claims', async (_name, token, status) => {
    const call = request(createApp()).post(`/api/offers/campaign/${campaignId}/claim`);
    if (token) call.set('Cookie', [`auth_token=${token}`]);
    await call.expect(status);
  });

  it('returns 400 for a malformed campaign id', async () => {
    const response = await claim('not-an-id', customerToken).expect(400);

    expect(response.body.error.message).toBe('Invalid campaign id');
    expect(Campaign.findOne).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown campaign', async () => {
    const response = await claim(unknownCampaignId, customerToken).expect(404);

    expect(response.body.error.message).toBe('Campaign not found');
  });

  it.each([
    ['completed', makeCampaign({ status: 'completed' })],
    ['expired', makeCampaign({ expiryDate: new Date(Date.now() - 60_000) })],
    ['sold out', makeCampaign()],
  ])('returns 409 when a campaign is %s', async (_name, campaign) => {
    claimState.campaigns.push(campaign);

    const response = await claim(campaignId, customerToken).expect(409);

    expect(response.body.data).toBeNull();
    expect(response.body.error.message).toBe('Campaign offer is no longer claimable');
  });

  it('rejects a historical claim without mutating available inventory or exposing a code', async () => {
    claimState.campaigns.push(makeCampaign());
    claimState.vouchers.push(
      makeCampaignVoucher({ isRedeemed: true, redeemedBy: customerId }),
      makeCampaignVoucher({ _id: voucherId2, code: 'AVAILABLE' }),
    );

    const response = await claim(campaignId, customerToken).expect(409);

    expect(response.body.data).toBeNull();
    expect(response.body.error.message).toBe('Campaign already claimed');
    expect(claimState.vouchers[1]).toMatchObject({ isRedeemed: false, redeemedBy: null });
    expect(JSON.stringify(response.body)).not.toContain('AVAILABLE');
  });

  it('assigns the first eligible code and writes history in one transaction', async () => {
    claimState.campaigns.push(makeCampaign());
    claimState.vouchers.push(
      makeCampaignVoucher({ _id: voucherId2, code: 'SECOND' }),
      makeCampaignVoucher({ _id: voucherId1, code: 'FIRST' }),
    );

    const response = await claim(campaignId, customerToken).expect(200);

    expect(response.body.data).toMatchObject({
      voucher: {
        code: 'FIRST',
        redeemedBy: customerId,
        campaign: { campaignId, organizationName: 'Fresh Market Ltd' },
      },
      message: 'Campaign offer claimed successfully',
    });
    expect(RedeemedVoucher.create).toHaveBeenCalledWith([
      expect.objectContaining({ userId: customerId, voucherId: voucherId1, campaignId }),
    ], { session: expect.objectContaining({ id: expect.stringMatching(/^offer-session-/) }) });
  });

  it('rolls back inventory and does not expose a code when redemption history fails', async () => {
    claimState.campaigns.push(makeCampaign());
    claimState.vouchers.push(makeCampaignVoucher());
    vi.mocked(RedeemedVoucher.create).mockRejectedValueOnce(new Error('history unavailable'));
    const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const response = await claim(campaignId, customerToken).expect(500);
    stderrWrite.mockRestore();

    expect(claimState.vouchers[0]).toMatchObject({ isRedeemed: false, redeemedBy: null });
    expect(response.body.data).toBeNull();
    expect(JSON.stringify(response.body)).not.toContain('CAMPAIGN-CODE');
  });

  it('commits one same-customer claim and rolls the duplicate back', async () => {
    claimState.campaigns.push(makeCampaign());
    claimState.vouchers.push(
      makeCampaignVoucher({ _id: voucherId1, code: 'FIRST' }),
      makeCampaignVoucher({ _id: voucherId2, code: 'SECOND' }),
    );
    let releasePriorChecks!: () => void;
    const bothPriorChecksStarted = new Promise<void>((resolve) => { releasePriorChecks = resolve; });
    let priorChecks = 0;
    claimState.priorClaimBarrier = async () => {
      priorChecks += 1;
      if (priorChecks === 1) await bothPriorChecksStarted;
      else releasePriorChecks();
      return null;
    };
    let releaseFirstHistory!: () => void;
    const secondHistoryStarted = new Promise<void>((resolve) => { releaseFirstHistory = resolve; });
    let historyCalls = 0;
    vi.mocked(RedeemedVoucher.create).mockImplementation(async () => {
      historyCalls += 1;
      if (historyCalls === 1) {
        await secondHistoryStarted;
        return [{}];
      }
      releaseFirstHistory();
      throw Object.assign(new Error('duplicate'), { code: 11000 });
    });

    const responses = await Promise.all([
      claim(campaignId, customerToken),
      claim(campaignId, customerToken),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(claimState.vouchers.filter((voucher) => voucher.isRedeemed)).toHaveLength(1);
    expect(responses.find((response) => response.status === 409)?.body.data).toBeNull();
    expect(JSON.stringify(responses.find((response) => response.status === 409)?.body)).not.toContain('SECOND');
  });

  it('lets different customers receive different campaign codes', async () => {
    claimState.campaigns.push(makeCampaign());
    claimState.vouchers.push(
      makeCampaignVoucher({ _id: voucherId1, code: 'FIRST' }),
      makeCampaignVoucher({ _id: voucherId2, code: 'SECOND' }),
    );

    const responses = await Promise.all([
      claim(campaignId, customerToken),
      claim(campaignId, signAuthToken({ userId: otherCustomerId }, '1h')),
    ]);

    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    expect(new Set(responses.map((response) => response.body.data.voucher.code)).size).toBe(2);
  });

  it('completes the campaign when its final code is claimed', async () => {
    const campaign = makeCampaign();
    claimState.campaigns.push(campaign);
    claimState.vouchers.push(makeCampaignVoucher());

    await claim(campaignId, customerToken).expect(200);

    expect(campaign.status).toBe('completed');
    expect(Campaign.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: campaignId, status: 'active' },
      { $set: { status: 'completed' } },
      { session: expect.objectContaining({ id: expect.stringMatching(/^offer-session-/) }) },
    );
  });
});

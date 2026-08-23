import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.js';

const offerState = vi.hoisted(() => ({
  pipeline: [] as Record<string, unknown>[],
  rows: [] as Record<string, unknown>[],
}));

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
vi.mock('../models/Voucher', () => ({
  Voucher: {
    aggregate: vi.fn(async (pipeline: Record<string, unknown>[]) => {
      offerState.pipeline = pipeline;
      return [{
        metadata: [{ total: offerState.rows.length }],
        page: offerState.rows,
      }];
    }),
  },
}));

const lastPipeline = () => offerState.pipeline;

describe('offer routes', () => {
  beforeEach(() => {
    offerState.pipeline = [];
    offerState.rows = [];
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
});

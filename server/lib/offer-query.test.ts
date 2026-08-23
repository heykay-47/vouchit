import { describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { encodeOfferCursor } from './offer-cursor.js';
import {
  buildCursorMatch,
  buildOfferPipeline,
  buildPublicMatch,
  buildSearchMatch,
  buildViewerClaimStages,
  escapeSearchPattern,
  parseOfferQuery,
} from './offer-query.js';
import { toPublicOffer, type OfferAggregateRow } from './offer-serializer.js';

const now = new Date('2026-08-23T00:00:00.000Z');

describe('offer query primitives', () => {
  it('parses bounded canonical offer filters', () => {
    expect(parseOfferQuery({
      q: '  fresh.*  ',
      platform: 'Google Pay',
      category: 'Shopping',
      source: 'campaign',
      expiringSoon: 'true',
      limit: '24',
    })).toMatchObject({
      q: 'fresh.*',
      platform: 'Google Pay',
      category: 'Shopping',
      source: 'campaign',
      expiringSoon: true,
      limit: 24,
    });
    expect(escapeSearchPattern('fresh.*[deal]')).toBe('fresh\\.\\*\\[deal\\]');
  });

  it.each([
    { unknown: 'field' },
    { q: ['one', 'two'] },
    { q: 'x'.repeat(101) },
    { cursor: 'x'.repeat(513) },
    { expiringSoon: '1' },
    { limit: ['24'] },
    { limit: true },
    { limit: 24 },
    { limit: '0' },
    { limit: '49' },
  ])('rejects malformed query %j as a Zod error', (query) => {
    expect(() => parseOfferQuery(query)).toThrow(ZodError);
  });

  it('builds a source and canonical field match without private fields', () => {
    expect(buildPublicMatch({
      source: 'campaign',
      platform: 'Google Pay',
      category: 'Shopping',
      expiringSoon: false,
      now,
    })).toEqual({
      kind: 'campaign',
      platform: 'Google Pay',
      category: 'Shopping',
    });
  });

  it('builds literal case-insensitive search across public text only', () => {
    expect(buildSearchMatch('fresh.*')).toEqual({
      $or: [
        { title: { $regex: 'fresh\\.\\*', $options: 'i' } },
        { description: { $regex: 'fresh\\.\\*', $options: 'i' } },
        { platform: { $regex: 'fresh\\.\\*', $options: 'i' } },
        { category: { $regex: 'fresh\\.\\*', $options: 'i' } },
        { brandName: { $regex: 'fresh\\.\\*', $options: 'i' } },
        { organizationName: { $regex: 'fresh\\.\\*', $options: 'i' } },
      ],
    });
  });

  it('builds a strict cursor boundary for the stable tuple', () => {
    const stage = buildCursorMatch({
      version: 1,
      missingExpiry: 0,
      expiryDate: new Date('2026-09-01T00:00:00.000Z'),
      kind: 'campaign',
      id: '507f1f77bcf86cd799439011',
    });

    expect(stage).toEqual({
      $or: [
        { missingExpiry: { $gt: 0 } },
        { missingExpiry: 0, expiryDate: { $gt: new Date('2026-09-01T00:00:00.000Z') } },
        {
          missingExpiry: 0,
          expiryDate: new Date('2026-09-01T00:00:00.000Z'),
          kind: { $gt: 'campaign' },
        },
        {
          missingExpiry: 0,
          expiryDate: new Date('2026-09-01T00:00:00.000Z'),
          kind: 'campaign',
          _id: { $gt: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011') },
        },
      ],
    });
  });

  it('builds viewer-only claim stages without exposing claimant data', () => {
    const stages = buildViewerClaimStages({
      viewerId: '507f1f77bcf86cd799439022',
      viewerRole: 'customer',
    });

    expect(stages).toEqual([
      {
        $lookup: {
          from: 'vouchers',
          let: { campaignId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$campaignId', '$$campaignId'] },
                    { $eq: ['$sourceType', 'campaign'] },
                    { $eq: ['$isRedeemed', true] },
                    { $eq: ['$redeemedBy', new mongoose.Types.ObjectId('507f1f77bcf86cd799439022')] },
                  ],
                },
              },
            },
            { $limit: 1 },
          ],
          as: 'viewerClaims',
        },
      },
      { $set: { viewerClaimed: { $gt: [{ $size: '$viewerClaims' }, 0] } } },
      { $match: { viewerClaimed: false } },
      { $unset: ['viewerClaims', 'viewerClaimed'] },
    ]);
    expect(buildViewerClaimStages({ viewerId: '507f1f77bcf86cd799439022', viewerRole: 'business' }))
      .toEqual([]);
    expect(buildViewerClaimStages({})).toEqual([]);
  });

  it('groups only eligible campaign inventory before public pagination', () => {
    const pipeline = buildOfferPipeline({
      now,
      source: 'all',
      expiringSoon: false,
      limit: 24,
    });
    const union = pipeline.find((stage) => '$unionWith' in stage)?.$unionWith as {
      coll: string;
      pipeline: Record<string, unknown>[];
    };

    expect(pipeline[0]).toEqual({ $match: { $and: [
      { $or: [{ sourceType: 'community' }, { sourceType: { $exists: false } }] },
      {
        isActive: true,
        isRedeemed: false,
        $or: [
          { expiryDate: null },
          { expiryDate: { $exists: false } },
          { expiryDate: { $gt: now } },
        ],
      },
    ] } });
    const communityProjection = pipeline[1].$project as Record<string, unknown>;
    expect(communityProjection).toEqual({
      _id: 1,
      kind: { $literal: 'community' },
      title: 1,
      description: 1,
      platform: 1,
      imageUrl: 1,
      expiryDate: { $ifNull: ['$expiryDate', null] },
      value: 1,
      donatedBy: 1,
      donatedAt: 1,
      reportCount: 1,
      category: 1,
    });
    expect(union.coll).toBe('campaigns');
    expect(union.pipeline).toContainEqual({ $match: {
      status: 'active',
      expiryDate: { $gt: now },
    } });
    expect(union.pipeline).toContainEqual({ $lookup: {
      from: 'businessprofiles',
      localField: 'businessProfileId',
      foreignField: '_id',
      pipeline: [{ $project: { _id: 0, organizationName: 1 } }],
      as: 'profile',
    } });
    expect(union.pipeline).toContainEqual({ $lookup: {
      from: 'vouchers',
      let: { campaignId: '$_id' },
      pipeline: [
        { $match: { $expr: { $and: [
          { $eq: ['$campaignId', '$$campaignId'] },
          { $eq: ['$sourceType', 'campaign'] },
          { $eq: ['$isActive', true] },
          { $eq: ['$isRedeemed', false] },
          { $gt: ['$expiryDate', now] },
        ] } } },
        { $count: 'remainingCount' },
      ],
      as: 'inventory',
    } });
    expect(union.pipeline).toContainEqual({ $set: {
      remainingCount: { $ifNull: [{ $first: '$inventory.remainingCount' }, 0] },
    } });
    expect(union.pipeline).toContainEqual({ $match: { remainingCount: { $gt: 0 } } });
    const campaignProjection = union.pipeline.find((stage) => '$project' in stage)?.$project as Record<string, unknown>;
    expect(campaignProjection).toEqual({
      _id: 1,
      kind: { $literal: 'campaign' },
      title: 1,
      description: 1,
      terms: 1,
      platform: 1,
      category: 1,
      imageUrl: 1,
      expiryDate: 1,
      value: 1,
      brandName: 1,
      organizationName: { $arrayElemAt: ['$profile.organizationName', 0] },
      remainingCount: 1,
    });

    const campaignRow: OfferAggregateRow = {
      _id: '507f1f77bcf86cd799439012',
      kind: 'campaign',
      title: 'Business reward',
      description: 'Published inventory',
      terms: 'One per customer',
      platform: 'Google Pay',
      category: 'Shopping',
      imageUrl: 'https://example.com/campaign.png',
      expiryDate: new Date('2026-09-02T00:00:00.000Z'),
      value: 'INR 200',
      brandName: 'Fresh Rewards',
      organizationName: 'Fresh Market Ltd',
      remainingCount: 3,
      missingExpiry: 0,
    };
    expect(toPublicOffer(campaignRow)).toMatchObject({ value: 'INR 200' });

    expect(pipeline).toContainEqual({
      $set: { missingExpiry: { $cond: [{ $eq: ['$expiryDate', null] }, 1, 0] } },
    });
    expect(pipeline.at(-1)).toEqual({
      $facet: {
        metadata: [{ $count: 'total' }],
        page: [
          { $sort: { missingExpiry: 1, expiryDate: 1, kind: 1, _id: 1 } },
          { $limit: 25 },
        ],
      },
    });
  });

  it('places public filters, search, cursor, and viewer stages before the facet', () => {
    const cursor = encodeOfferCursor({
      missingExpiry: 0,
      expiryDate: new Date('2026-09-01T00:00:00.000Z'),
      kind: 'community',
      id: '507f1f77bcf86cd799439011',
    });
    const pipeline = buildOfferPipeline({
      source: 'campaign',
      expiringSoon: false,
      limit: 24,
      now,
      q: 'fresh.*',
      cursor,
      viewerId: '507f1f77bcf86cd799439022',
      viewerRole: 'customer',
    });
    const unionIndex = pipeline.findIndex((stage) => '$unionWith' in stage);
    const facetIndex = pipeline.findIndex((stage) => '$facet' in stage);
    const publicMatch = { $match: buildPublicMatch({
      source: 'campaign',
      expiringSoon: false,
      now,
      q: 'fresh.*',
      limit: 24,
      cursor,
      viewerId: '507f1f77bcf86cd799439022',
      viewerRole: 'customer',
    }) };
    const searchMatch = { $match: buildSearchMatch('fresh.*') };
    const publicIndex = pipeline.findIndex((stage) => JSON.stringify(stage) === JSON.stringify(publicMatch));
    const searchIndex = pipeline.findIndex((stage) => JSON.stringify(stage) === JSON.stringify(searchMatch));

    expect(unionIndex).toBeGreaterThanOrEqual(0);
    expect(publicIndex).toBeGreaterThan(unionIndex);
    expect(searchIndex).toBeGreaterThan(unionIndex);
    expect(facetIndex).toBeGreaterThan(searchIndex);
    expect(facetIndex).toBeGreaterThan(publicIndex);
    const facet = pipeline[facetIndex].$facet as {
      metadata: Record<string, unknown>[];
      page: Record<string, unknown>[];
    };
    expect(pipeline.slice(0, facetIndex)).not.toContainEqual({ $match: buildCursorMatch(cursor) });
    expect(facet.metadata).toEqual([{ $count: 'total' }]);
    expect(facet.page[0]).toEqual({ $match: buildCursorMatch(cursor) });
    expect(pipeline[facetIndex]).toEqual({
      $facet: {
        metadata: [{ $count: 'total' }],
        page: [
          { $match: buildCursorMatch(cursor) },
          { $sort: { missingExpiry: 1, expiryDate: 1, kind: 1, _id: 1 } },
          { $limit: 25 },
        ],
      },
    });

  });
});

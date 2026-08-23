import mongoose from 'mongoose';
import { z } from 'zod';
import { decodeOfferCursor, type OfferCursor } from './offer-cursor.js';

export const OFFER_PLATFORMS = ['Google Pay', 'Paytm', 'PhonePe', 'Other'] as const;
export const OFFER_CATEGORIES = ['Food', 'Shopping', 'Travel', 'Entertainment', 'Electronics', 'Health', 'Other'] as const;

const rawOfferQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  platform: z.enum(OFFER_PLATFORMS).optional(),
  category: z.enum(OFFER_CATEGORIES).optional(),
  source: z.enum(['all', 'community', 'campaign']).default('all'),
  expiringSoon: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  limit: z.coerce.number().int().min(1).max(48).default(24),
  cursor: z.string().max(512).optional(),
}).strict();

export type OfferQuery = z.infer<typeof rawOfferQuerySchema>;
export type OfferPipelineStage = Record<string, unknown>;
export type OfferViewerRole = 'customer' | 'business';
export type OfferViewerInput = {
  viewerId?: string;
  viewerRole?: OfferViewerRole;
};
export type OfferPipelineInput = Omit<OfferQuery, 'cursor'> & {
  cursor?: string | OfferCursor;
  now?: Date;
  viewerId?: string;
  viewerRole?: OfferViewerRole;
};
export type OfferMatchInput = Partial<Pick<OfferQuery, 'source' | 'platform' | 'category' | 'expiringSoon'>> & {
  now?: Date;
  expiringSoonUntil?: Date;
  [key: string]: unknown;
};

export const escapeSearchPattern = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const parseOfferQuery = (query: unknown) => rawOfferQuerySchema.parse(query);

export const buildPublicMatch = (input: OfferMatchInput): Record<string, unknown> => {
  const match: Record<string, unknown> = {};

  if (input.platform) match.platform = input.platform;
  if (input.category) match.category = input.category;
  if (input.source && input.source !== 'all') match.kind = input.source;

  if (input.expiringSoon) {
    const now = input.now ?? new Date();
    const expiringSoonUntil = input.expiringSoonUntil
      ?? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    match.expiryDate = { $gt: now, $lte: expiringSoonUntil };
  }

  return match;
};

export const buildSearchMatch = (value?: string): Record<string, unknown> | null => {
  if (!value) return null;
  const pattern = escapeSearchPattern(value);
  return {
    $or: [
      { title: { $regex: pattern, $options: 'i' } },
      { description: { $regex: pattern, $options: 'i' } },
      { platform: { $regex: pattern, $options: 'i' } },
      { category: { $regex: pattern, $options: 'i' } },
      { brandName: { $regex: pattern, $options: 'i' } },
      { organizationName: { $regex: pattern, $options: 'i' } },
    ],
  };
};

export const buildCursorMatch = (
  cursor: OfferCursor | string | null | undefined,
): Record<string, unknown> | null => {
  if (cursor == null) return null;
  const parsed = typeof cursor === 'string' ? decodeOfferCursor(cursor) : cursor;
  const id = new mongoose.Types.ObjectId(parsed.id);

  return {
    $or: [
      { missingExpiry: { $gt: parsed.missingExpiry } },
      ...(parsed.expiryDate ? [{
        missingExpiry: parsed.missingExpiry,
        expiryDate: { $gt: parsed.expiryDate },
      }] : []),
      {
        missingExpiry: parsed.missingExpiry,
        expiryDate: parsed.expiryDate,
        kind: { $gt: parsed.kind },
      },
      {
        missingExpiry: parsed.missingExpiry,
        expiryDate: parsed.expiryDate,
        kind: parsed.kind,
        _id: { $gt: id },
      },
    ],
  };
};

export const buildViewerClaimStages = ({ viewerId, viewerRole }: OfferViewerInput = {}): OfferPipelineStage[] => {
  if (!viewerId || viewerRole !== 'customer') return [];

  const viewerObjectId = new mongoose.Types.ObjectId(viewerId);
  return [
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
                  { $eq: ['$redeemedBy', viewerObjectId] },
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
  ];
};

const communityStages = (now: Date): OfferPipelineStage[] => [
  {
    $match: {
      $and: [
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
      ],
    },
  },
  {
    $project: {
      _id: 1,
      kind: { $literal: 'community' },
      title: 1,
      description: 1,
      platform: 1,
      imageUrl: 1,
      expiryDate: 1,
      value: 1,
      donatedBy: 1,
      donatedAt: 1,
      reportCount: 1,
      category: 1,
    },
  },
];

const campaignStages = (now: Date): OfferPipelineStage[] => [
  {
    $match: {
      status: 'active',
      expiryDate: { $gt: now },
    },
  },
  {
    $lookup: {
      from: 'businessprofiles',
      localField: 'businessProfileId',
      foreignField: '_id',
      pipeline: [{ $project: { _id: 0, organizationName: 1 } }],
      as: 'profile',
    },
  },
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
                { $eq: ['$isActive', true] },
                { $eq: ['$isRedeemed', false] },
                { $gt: ['$expiryDate', now] },
              ],
            },
          },
        },
        { $count: 'remainingCount' },
      ],
      as: 'inventory',
    },
  },
  {
    $set: {
      remainingCount: { $ifNull: [{ $first: '$inventory.remainingCount' }, 0] },
    },
  },
  { $match: { remainingCount: { $gt: 0 } } },
  {
    $project: {
      _id: 1,
      kind: { $literal: 'campaign' },
      title: 1,
      description: 1,
      terms: 1,
      platform: 1,
      category: 1,
      imageUrl: 1,
      expiryDate: 1,
      brandName: 1,
      organizationName: { $arrayElemAt: ['$profile.organizationName', 0] },
      remainingCount: 1,
    },
  },
];

export const buildOfferPipeline = (input: OfferPipelineInput): OfferPipelineStage[] => {
  const now = input.now ?? new Date();
  const pipeline: OfferPipelineStage[] = [
    ...communityStages(now),
    {
      $unionWith: {
        coll: 'campaigns',
        pipeline: campaignStages(now),
      },
    },
    { $set: { missingExpiry: { $cond: [{ $eq: ['$expiryDate', null] }, 1, 0] } } },
  ];

  const publicMatch = buildPublicMatch(input);
  if (Object.keys(publicMatch).length > 0) pipeline.push({ $match: publicMatch });

  const searchStage = buildSearchMatch(input.q);
  if (searchStage) pipeline.push({ $match: searchStage });

  pipeline.push(...buildViewerClaimStages({
    viewerId: input.viewerId,
    viewerRole: input.viewerRole,
  }));

  const cursorStage = buildCursorMatch(input.cursor);
  const pageStages: OfferPipelineStage[] = [];
  if (cursorStage) pageStages.push({ $match: cursorStage });
  pageStages.push(
    { $sort: { missingExpiry: 1, expiryDate: 1, kind: 1, _id: 1 } },
    { $limit: input.limit + 1 },
  );

  pipeline.push({
    $facet: {
      metadata: [{ $count: 'total' }],
      page: pageStages,
    },
  });

  return pipeline;
};

export type { OfferAggregateRow } from './offer-serializer.js';

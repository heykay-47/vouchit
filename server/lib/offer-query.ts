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
export type OfferPipelineInput = OfferQuery & {
  now?: Date;
  viewerId?: string;
  expiringSoonUntil?: Date;
};
export type OfferMatchInput = Pick<OfferQuery, 'source' | 'platform' | 'category' | 'expiringSoon'> & {
  now?: Date;
  expiringSoonUntil?: Date;
};

export const escapeSearchPattern = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const parseOfferQuery = (query: unknown) => rawOfferQuerySchema.parse(query);

export const buildPublicMatch = (input: OfferMatchInput): OfferPipelineStage => {
  const match: Record<string, unknown> = {};

  if (input.source !== 'all') match.kind = input.source;
  if (input.platform !== undefined) match.platform = input.platform;
  if (input.category !== undefined) match.category = input.category;

  if (input.expiringSoon) {
    const now = input.now ?? new Date();
    const expiringSoonUntil = input.expiringSoonUntil
      ?? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    match.expiryDate = { $gt: now, $lte: expiringSoonUntil };
  }

  return { $match: match };
};

export const buildSearchMatch = (value?: string): OfferPipelineStage | undefined => {
  if (!value) return undefined;
  const pattern = escapeSearchPattern(value);
  return {
    $match: {
      $or: [
        { title: { $regex: pattern, $options: 'i' } },
        { description: { $regex: pattern, $options: 'i' } },
        { brandName: { $regex: pattern, $options: 'i' } },
        { organizationName: { $regex: pattern, $options: 'i' } },
      ],
    },
  };
};

export const buildCursorMatch = (
  cursor: OfferCursor | string | undefined,
): OfferPipelineStage | undefined => {
  if (cursor === undefined) return undefined;
  const parsed = typeof cursor === 'string' ? decodeOfferCursor(cursor) : cursor;
  const id = new mongoose.Types.ObjectId(parsed.id);

  const sameExpiry = parsed.missingExpiry === 0
    ? [
      {
        missingExpiry: 0,
        expiryDate: { $gt: parsed.expiryDate },
      },
      {
        missingExpiry: 0,
        expiryDate: parsed.expiryDate,
        kind: { $gt: parsed.kind },
      },
      {
        missingExpiry: 0,
        expiryDate: parsed.expiryDate,
        kind: parsed.kind,
        _id: { $gt: id },
      },
    ]
    : [
      {
        missingExpiry: 1,
        kind: { $gt: parsed.kind },
      },
      {
        missingExpiry: 1,
        kind: parsed.kind,
        _id: { $gt: id },
      },
    ];

  return {
    $match: {
      $or: [
        { missingExpiry: { $gt: parsed.missingExpiry } },
        ...sameExpiry,
      ],
    },
  };
};

export const buildViewerClaimStages = (viewerId?: string): OfferPipelineStage[] => {
  if (!viewerId) return [];

  const viewerObjectId = new mongoose.Types.ObjectId(viewerId);
  return [
    {
      $lookup: {
        from: 'redeemedvouchers',
        let: { campaignId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$userId', viewerObjectId] },
                  { $eq: ['$campaignId', '$$campaignId'] },
                ],
              },
            },
          },
          { $limit: 1 },
          { $project: { _id: 1 } },
        ],
        as: 'viewerClaims',
      },
    },
    {
      $match: {
        $or: [
          { kind: 'community' },
          { kind: 'campaign', viewerClaims: { $size: 0 } },
        ],
      },
    },
    { $unset: 'viewerClaims' },
  ];
};

const communityStages = (now: Date): OfferPipelineStage[] => [
  {
    $match: {
      isActive: true,
      isRedeemed: false,
      $or: [
        { sourceType: 'community' },
        { sourceType: { $exists: false } },
      ],
      $and: [
        {
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
      expiryDate: { $ifNull: ['$expiryDate', null] },
      value: 1,
      donatedBy: 1,
      donatedAt: 1,
      reportCount: 1,
      category: { $ifNull: ['$category', null] },
      missingExpiry: {
        $cond: [
          { $eq: [{ $ifNull: ['$expiryDate', null] }, null] },
          1,
          0,
        ],
      },
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
      as: 'businessProfile',
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
                {
                  $or: [
                    { $eq: ['$expiryDate', null] },
                    { $gt: ['$expiryDate', now] },
                  ],
                },
              ],
            },
          },
        },
        { $project: { _id: 0, value: 1 } },
      ],
      as: 'eligibleInventory',
    },
  },
  {
    $set: {
      kind: { $literal: 'campaign' },
      organizationName: { $arrayElemAt: ['$businessProfile.organizationName', 0] },
      remainingCount: { $size: '$eligibleInventory' },
      value: { $arrayElemAt: ['$eligibleInventory.value', 0] },
      missingExpiry: { $literal: 0 },
    },
  },
  { $match: { remainingCount: { $gt: 0 } } },
  {
    $project: {
      _id: 1,
      kind: 1,
      title: 1,
      description: 1,
      terms: 1,
      platform: 1,
      category: 1,
      imageUrl: 1,
      expiryDate: 1,
      value: 1,
      brandName: 1,
      organizationName: 1,
      remainingCount: 1,
      missingExpiry: 1,
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
    buildPublicMatch(input),
  ];

  const searchStage = buildSearchMatch(input.q);
  if (searchStage) pipeline.push(searchStage);

  const cursorStage = buildCursorMatch(input.cursor);
  if (cursorStage) pipeline.push(cursorStage);

  pipeline.push(...buildViewerClaimStages(input.viewerId));
  pipeline.push(
    { $sort: { missingExpiry: 1, expiryDate: 1, kind: 1, _id: 1 } },
    {
      $facet: {
        metadata: [{ $count: 'total' }],
        page: [{ $limit: input.limit }],
      },
    },
  );

  return pipeline;
};

export type { OfferAggregateRow } from './offer-serializer.js';

import { Router } from 'express';
import mongoose, { type PipelineStage } from 'mongoose';
import { connectDb } from '../lib/db.js';
import { cursorRowFor, decodeOfferCursor, encodeOfferCursor } from '../lib/offer-cursor.js';
import { ApiError, asyncRoute, ok } from '../lib/http.js';
import { buildOfferPipeline, parseOfferQuery, type OfferAggregateRow } from '../lib/offer-query.js';
import { toPublicOffer } from '../lib/offer-serializer.js';
import { resolveUserRole } from '../lib/roles.js';
import { withTransaction } from '../lib/transaction.js';
import { toVoucherResponse } from '../lib/voucher-serializer.js';
import { getOptionalUserId, optionalAuth, requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { BusinessProfile } from '../models/BusinessProfile.js';
import { Campaign } from '../models/Campaign.js';
import { RedeemedVoucher } from '../models/RedeemedVoucher.js';
import { User } from '../models/User.js';
import { Voucher } from '../models/Voucher.js';

const router = Router();

router.get('/', optionalAuth, asyncRoute(async (req, res) => {
  const parsed = parseOfferQuery(req.query);
  await connectDb();
  const viewerId = getOptionalUserId(req);
  const viewer = viewerId
    ? await User.findById(viewerId).select('role').lean() as { role?: unknown } | null
    : null;
  const viewerRole = viewer ? resolveUserRole(viewer.role) : undefined;
  const cursor = parsed.cursor !== undefined ? decodeOfferCursor(parsed.cursor) : undefined;
  const pipeline = buildOfferPipeline({
    ...parsed,
    cursor,
    now: new Date(),
    viewerId,
    viewerRole,
  }) as unknown as PipelineStage[];
  const [result = { metadata: [], page: [] }] = await Voucher.aggregate(
    pipeline,
  );
  const rows = result.page as OfferAggregateRow[];
  const hasMore = rows.length > parsed.limit;
  const visibleRows = rows.slice(0, parsed.limit);
  const last = visibleRows.at(-1);

  ok(res, {
    offers: visibleRows.map((row) => toPublicOffer(row, viewerId)),
    total: result.metadata[0]?.total ?? 0,
    nextCursor: hasMore && last ? encodeOfferCursor(cursorRowFor(last)) : null,
    hasMore,
  });
}));

router.post('/campaign/:campaignId/claim', requireAuth, requireRole('customer'), asyncRoute(async (req, res) => {
  await connectDb();
  const campaignId = req.params.campaignId;
  const userId = (req as AuthedRequest).userId;
  if (!mongoose.isValidObjectId(campaignId)) {
    throw new ApiError(400, 'Invalid campaign id');
  }

  const now = new Date();
  let result;
  try {
    result = await withTransaction(async (session) => {
      const campaign = await Campaign.findOne({ _id: campaignId }, null, { session });
      if (!campaign) throw new ApiError(404, 'Campaign not found');
      if (campaign.status !== 'active' || campaign.expiryDate <= now) {
        throw new ApiError(409, 'Campaign offer is no longer claimable');
      }

      const priorClaim = await Voucher.findOne({
        campaignId,
        sourceType: 'campaign',
        isRedeemed: true,
        redeemedBy: userId,
      }, { _id: 1 }, { session });
      if (priorClaim) throw new ApiError(409, 'Campaign already claimed');

      const voucher = await Voucher.findOneAndUpdate(
        {
          campaignId,
          sourceType: 'campaign',
          isActive: true,
          isRedeemed: false,
          expiryDate: { $gt: now },
        },
        { $set: { isRedeemed: true, redeemedBy: userId, redeemedAt: now } },
        { new: true, session, sort: { _id: 1 } },
      );
      if (!voucher) throw new ApiError(409, 'Campaign offer is no longer claimable');

      await RedeemedVoucher.create([{
        userId,
        voucherId: voucher._id,
        campaignId: campaign._id,
        redeemedAt: now,
      }], { session });

      const remaining = await Voucher.findOne({
        campaignId,
        sourceType: 'campaign',
        isActive: true,
        isRedeemed: false,
        expiryDate: { $gt: now },
      }, { _id: 1 }, { session });
      if (!remaining) {
        await Campaign.findOneAndUpdate(
          { _id: campaignId, status: 'active' },
          { $set: { status: 'completed' } },
          { session },
        );
      }

      const profile = await BusinessProfile.findOne(
        { _id: campaign.businessProfileId },
        null,
        { session },
      );
      return { voucher, campaign, profile };
    });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
      throw new ApiError(409, 'Campaign already claimed');
    }
    throw error;
  }

  ok(res, {
    voucher: toVoucherResponse(result.voucher, userId, {
      campaign: result.campaign,
      profile: result.profile ?? undefined,
    }),
    message: 'Campaign offer claimed successfully',
  });
}));

export { router as offersRouter };

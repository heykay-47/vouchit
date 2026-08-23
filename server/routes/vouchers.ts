import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { connectDb } from '../lib/db.js';
import { ApiError, asyncRoute, ok } from '../lib/http.js';
import { publicVoucherFilter, toVoucherResponse, voucherAvailabilityFilter } from '../lib/voucher-serializer.js';
import { getOptionalUserId, optionalAuth, requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { Activity } from '../models/Activity.js';
import { BusinessProfile } from '../models/BusinessProfile.js';
import { Campaign } from '../models/Campaign.js';
import { Comment } from '../models/Comment.js';
import { RedeemedVoucher } from '../models/RedeemedVoucher.js';
import { ReportedVoucher } from '../models/ReportedVoucher.js';
import { User } from '../models/User.js';
import { Voucher } from '../models/Voucher.js';

const router = Router();

const voucherSchema = z.object({
  platform: z.string().min(1),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(1000),
  code: z.string().min(1).max(200),
  imageUrl: z.string().url().refine(
    (u) => u.startsWith('https://') || u.startsWith('data:image/'),
    'Image URL must be https or a data:image URL',
  ),
  expiryDate: z.string().datetime().optional().nullable(),
  value: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
});

const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

router.get('/', optionalAuth, asyncRoute(async (req, res) => {
  await connectDb();
  const { limit, offset } = listSchema.parse(req.query);
  const viewerId = getOptionalUserId(req);
  const now = new Date();
  const activeCampaigns = await Campaign
    .find({ status: 'active', expiryDate: { $gt: now } })
    .select('_id')
    .lean();
  const activeCampaignIds = activeCampaigns.map((campaign: any) => campaign._id.toString());
  const publicFilter = publicVoucherFilter(activeCampaignIds, now);
  const communityHistoryFilter = {
    $or: [{ sourceType: 'community' }, { sourceType: { $exists: false } }],
  };
  const query = viewerId
    ? {
        $or: [
          publicFilter,
          { $and: [communityHistoryFilter, { donatedBy: viewerId }] },
          { $and: [communityHistoryFilter, { redeemedBy: viewerId }] },
          { sourceType: 'campaign', redeemedBy: viewerId },
        ],
      }
    : publicFilter;
  const sort = viewerId
    ? { redeemedAt: -1 as const, donatedAt: -1 as const }
    : { donatedAt: -1 as const };
  const vouchers = await Voucher
    .find(query)
    .sort(sort)
    .skip(offset)
    .limit(limit)
    .lean();
  const referencedCampaignIds = [...new Set(vouchers
    .filter((voucher: any) => voucher.sourceType === 'campaign' && voucher.campaignId)
    .map((voucher: any) => voucher.campaignId.toString()))];
  const referencedCampaigns = referencedCampaignIds.length > 0
    ? await Campaign.find({ _id: { $in: referencedCampaignIds } }).lean()
    : [];
  const campaignMap = new Map<string, any>(referencedCampaigns
    .map((campaign: any) => [campaign._id.toString(), campaign]));
  const profileIds = [...new Set([...campaignMap.values()]
    .filter((campaign) => campaign.businessProfileId)
    .map((campaign) => campaign.businessProfileId.toString()))];
  const profiles = profileIds.length > 0
    ? await BusinessProfile.find({ _id: { $in: profileIds } }).lean()
    : [];
  const profileMap = new Map<string, any>(profiles.map((profile: any) => [profile._id.toString(), profile]));

  ok(res, {
    vouchers: vouchers.map((voucher: any) => {
      const campaign = voucher.campaignId ? campaignMap.get(voucher.campaignId.toString()) : undefined;
      const profile = campaign?.businessProfileId
        ? profileMap.get(campaign.businessProfileId.toString())
        : undefined;
      return toVoucherResponse(voucher, viewerId, { campaign, profile });
    }),
  });
}));

router.post('/', requireAuth, requireRole('customer'), asyncRoute(async (req, res) => {
  await connectDb();
  const input = voucherSchema.parse(req.body);
  const userId = (req as AuthedRequest).userId;

  const voucher = await Voucher.create({
    ...input,
    expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
    donatedBy: userId,
  });

  await Activity.create({
    userId,
    activityType: 'donation',
    entityId: voucher._id,
    entityType: 'voucher',
    title: 'Voucher donated',
    description: voucher.title,
  }).catch((error) => {
    process.stderr.write(`Failed to create donation activity: ${error instanceof Error ? error.message : String(error)}\n`);
  });

  ok(res, { voucher: toVoucherResponse(voucher, userId) }, 201);
}));

router.post('/:id/redeem', requireAuth, requireRole('customer'), asyncRoute(async (req, res) => {
  await connectDb();
  const userId = (req as AuthedRequest).userId;
  const voucherId = req.params.id;

  if (!mongoose.isValidObjectId(voucherId)) {
    throw new ApiError(400, 'Invalid voucher id');
  }

  const communitySourceFilter = {
    $or: [
      { sourceType: 'community' },
      { sourceType: { $exists: false } },
    ],
  };

  const voucher = await Voucher.findOneAndUpdate(
    {
      $and: [
        { _id: voucherId },
        voucherAvailabilityFilter(),
        communitySourceFilter,
        { donatedBy: { $ne: userId } },
      ],
    },
    { isRedeemed: true, redeemedBy: userId, redeemedAt: new Date() },
    { new: true }
  );

  if (!voucher) {
    throw new ApiError(409, 'Voucher is not available');
  }

  await RedeemedVoucher.create({ userId, voucherId }).catch(() => undefined);
  ok(res, { voucher: toVoucherResponse(voucher, userId), message: 'Voucher redeemed successfully' });
}));

router.post('/:id/report', requireAuth, requireRole('customer'), asyncRoute(async (req, res) => {
  await connectDb();
  const userId = (req as AuthedRequest).userId;
  const voucherId = req.params.id;

  if (!mongoose.isValidObjectId(voucherId)) {
    throw new ApiError(400, 'Invalid voucher id');
  }

  try {
    await ReportedVoucher.create({ userId, voucherId });
  } catch {
    throw new ApiError(409, 'You already reported this voucher');
  }

  const voucher = await Voucher.findByIdAndUpdate(
    voucherId,
    [{ $set: { reportCount: { $add: ['$reportCount', 1] }, isActive: { $lt: [{ $add: ['$reportCount', 1] }, 5] } } }],
    { new: true }
  );

  if (!voucher) {
    throw new ApiError(404, 'Voucher not found');
  }

  ok(res, { voucher: toVoucherResponse(voucher, userId), message: 'Voucher reported as not working' });
}));

router.get('/:id/comments', asyncRoute(async (req, res) => {
  await connectDb();
  const voucherId = req.params.id;
  if (!mongoose.isValidObjectId(voucherId)) {
    throw new ApiError(400, 'Invalid voucher id');
  }
  const comments = await Comment.find({ voucherId }).sort({ createdAt: 1 }).limit(100);
  const users = await User.find({ _id: { $in: comments.map((comment: any) => comment.userId) } });
  const names = new Map(users.map((user: any) => [user._id.toString(), user.username]));

  ok(res, {
    comments: comments.map((comment: any) => ({
      id: comment._id.toString(),
      voucherId: comment.voucherId.toString(),
      userId: comment.userId.toString(),
      username: names.get(comment.userId.toString()) ?? 'Anonymous',
      text: comment.text,
      createdAt: comment.createdAt,
    })),
  });
}));

router.post('/:id/comments', requireAuth, requireRole('customer'), asyncRoute(async (req, res) => {
  await connectDb();
  const voucherId = req.params.id;
  if (!mongoose.isValidObjectId(voucherId)) {
    throw new ApiError(400, 'Invalid voucher id');
  }
  const input = z.object({ text: z.string().min(1).max(1000) }).parse(req.body);
  const userId = (req as AuthedRequest).userId;
  const voucher = await Voucher.findById(voucherId);
  if (!voucher) {
    throw new ApiError(404, 'Voucher not found');
  }

  const comment = await Comment.create({ voucherId, userId, text: input.text.trim() });
  const user = await User.findById(userId);

  ok(res, {
    comment: {
      id: comment._id.toString(),
      voucherId,
      userId,
      username: user?.username ?? 'Anonymous',
      text: comment.text,
      createdAt: comment.createdAt,
    },
  }, 201);
}));

export { router as vouchersRouter };

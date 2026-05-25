import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { connectDb } from '../lib/db';
import { ApiError, asyncRoute, ok } from '../lib/http';
import { requireAuth, type AuthedRequest } from '../middleware/auth';
import { Activity } from '../models/Activity';
import { Comment } from '../models/Comment';
import { RedeemedVoucher } from '../models/RedeemedVoucher';
import { ReportedVoucher } from '../models/ReportedVoucher';
import { User } from '../models/User';
import { Voucher } from '../models/Voucher';

const router = Router();

const voucherSchema = z.object({
  platform: z.string().min(1),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(1000),
  code: z.string().min(1).max(200),
  imageUrl: z.string().min(1),
  expiryDate: z.string().datetime().optional().nullable(),
  value: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
});

const toVoucherResponse = (voucher: any) => ({
  id: voucher._id.toString(),
  platform: voucher.platform,
  title: voucher.title,
  description: voucher.description,
  code: voucher.code,
  imageUrl: voucher.imageUrl,
  expiryDate: voucher.expiryDate ?? undefined,
  value: voucher.value ?? undefined,
  donatedBy: voucher.donatedBy?.toString?.() ?? String(voucher.donatedBy),
  donatedAt: voucher.donatedAt,
  isRedeemed: voucher.isRedeemed,
  redeemedBy: voucher.redeemedBy?.toString?.() ?? undefined,
  redeemedAt: voucher.redeemedAt ?? undefined,
  reportCount: voucher.reportCount,
  isActive: voucher.isActive,
  category: voucher.category ?? undefined,
});

router.get('/', asyncRoute(async (_req, res) => {
  await connectDb();
  const vouchers = await Voucher.find().sort({ donatedAt: -1 }).limit(200);
  ok(res, { vouchers: vouchers.map(toVoucherResponse) });
}));

router.post('/', requireAuth, asyncRoute(async (req, res) => {
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

  ok(res, { voucher: toVoucherResponse(voucher) }, 201);
}));

router.post('/:id/redeem', requireAuth, asyncRoute(async (req, res) => {
  await connectDb();
  const userId = (req as AuthedRequest).userId;
  const voucherId = req.params.id;

  if (!mongoose.isValidObjectId(voucherId)) {
    throw new ApiError(400, 'Invalid voucher id');
  }

  const voucher = await Voucher.findOneAndUpdate(
    { _id: voucherId, isActive: true, isRedeemed: false },
    { isRedeemed: true, redeemedBy: userId, redeemedAt: new Date() },
    { new: true }
  );

  if (!voucher) {
    throw new ApiError(409, 'Voucher is not available');
  }

  await RedeemedVoucher.create({ userId, voucherId }).catch(() => undefined);
  ok(res, { voucher: toVoucherResponse(voucher), message: 'Voucher redeemed successfully' });
}));

router.post('/:id/report', requireAuth, asyncRoute(async (req, res) => {
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

  ok(res, { voucher: toVoucherResponse(voucher), message: 'Voucher reported as not working' });
}));

router.get('/:id/comments', asyncRoute(async (req, res) => {
  await connectDb();
  const comments = await Comment.find({ voucherId: req.params.id }).sort({ createdAt: 1 });
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

router.post('/:id/comments', requireAuth, asyncRoute(async (req, res) => {
  await connectDb();
  const input = z.object({ text: z.string().min(1).max(1000) }).parse(req.body);
  const userId = (req as AuthedRequest).userId;
  const voucher = await Voucher.findById(req.params.id);
  if (!voucher) {
    throw new ApiError(404, 'Voucher not found');
  }

  const comment = await Comment.create({ voucherId: req.params.id, userId, text: input.text.trim() });
  const user = await User.findById(userId);

  ok(res, {
    comment: {
      id: comment._id.toString(),
      voucherId: req.params.id,
      userId,
      username: user?.username ?? 'Anonymous',
      text: comment.text,
      createdAt: comment.createdAt,
    },
  }, 201);
}));

export { router as vouchersRouter };

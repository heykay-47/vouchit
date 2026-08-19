import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { connectDb } from '../lib/db.js';
import { ApiError, asyncRoute, ok } from '../lib/http.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { toUserResponse } from '../lib/serializers.js';
import { Favorite } from '../models/Favorite.js';
import { User } from '../models/User.js';
import { Voucher } from '../models/Voucher.js';

const router = Router();
router.use(requireAuth);

const updateProfileSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  bio: z.string().max(500).nullable().optional(),
  profileImage: z.string().url().refine(
    (u) => u.startsWith('https://') || u.startsWith('data:image/'),
    'Image URL must be https or a data:image URL',
  ).nullable().optional(),
});

router.patch('/me', asyncRoute(async (req, res) => {
  await connectDb();
  const input = updateProfileSchema.parse(req.body);

  const user = await User.findByIdAndUpdate((req as AuthedRequest).userId, input, { new: true });
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  ok(res, { user: await toUserResponse(user) });
}));

router.patch('/me/preferences', asyncRoute(async (req, res) => {
  await connectDb();
  const notificationPreferences = z.object({
    email: z.boolean(),
    newVouchers: z.boolean(),
    voucherExpiry: z.boolean(),
    systemUpdates: z.boolean(),
  }).parse(req.body);

  const user = await User.findByIdAndUpdate(
    (req as AuthedRequest).userId,
    { notificationPreferences },
    { new: true }
  );
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  ok(res, { notificationPreferences: user.notificationPreferences });
}));

router.post('/me/favorites/:voucherId', requireRole('customer'), asyncRoute(async (req, res) => {
  await connectDb();
  const voucherId = req.params.voucherId;
  if (!mongoose.isValidObjectId(voucherId)) {
    throw new ApiError(400, 'Invalid voucher id');
  }
  const exists = await Voucher.exists({ _id: voucherId });
  if (!exists) {
    throw new ApiError(404, 'Voucher not found');
  }
  try {
    await Favorite.create({ userId: (req as AuthedRequest).userId, voucherId });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      throw new ApiError(409, 'Voucher is already in favorites');
    }
    throw error;
  }
  ok(res, { voucherId });
}));

router.delete('/me/favorites/:voucherId', requireRole('customer'), asyncRoute(async (req, res) => {
  await connectDb();
  const voucherId = req.params.voucherId;
  if (!mongoose.isValidObjectId(voucherId)) {
    throw new ApiError(400, 'Invalid voucher id');
  }
  await Favorite.deleteOne({ userId: (req as AuthedRequest).userId, voucherId });
  ok(res, { voucherId });
}));

export { router as usersRouter };

import { Router } from 'express';
import { z } from 'zod';
import { connectDb } from '../lib/db';
import { ApiError, asyncRoute, ok } from '../lib/http';
import { requireAuth, type AuthedRequest } from '../middleware/auth';
import { Favorite } from '../models/Favorite';
import { User } from '../models/User';

const router = Router();
router.use(requireAuth);

router.patch('/me', asyncRoute(async (req, res) => {
  await connectDb();
  const input = z.object({
    username: z.string().min(3).max(50).optional(),
    bio: z.string().max(500).nullable().optional(),
    profileImage: z.string().nullable().optional(),
  }).parse(req.body);

  const user = await User.findByIdAndUpdate((req as AuthedRequest).userId, input, { new: true });
  ok(res, { user });
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

  ok(res, { notificationPreferences: user.notificationPreferences });
}));

router.post('/me/favorites/:voucherId', asyncRoute(async (req, res) => {
  await connectDb();
  try {
    await Favorite.create({ userId: (req as AuthedRequest).userId, voucherId: req.params.voucherId });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      throw new ApiError(409, 'Voucher is already in favorites');
    }
    throw error;
  }
  ok(res, { voucherId: req.params.voucherId });
}));

router.delete('/me/favorites/:voucherId', asyncRoute(async (req, res) => {
  await connectDb();
  await Favorite.deleteOne({ userId: (req as AuthedRequest).userId, voucherId: req.params.voucherId });
  ok(res, { voucherId: req.params.voucherId });
}));

export { router as usersRouter };

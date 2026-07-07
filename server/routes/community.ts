import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { connectDb } from '../lib/db.js';
import { ApiError, asyncRoute, ok } from '../lib/http.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { Activity } from '../models/Activity.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { Voucher } from '../models/Voucher.js';
import { VoucherRequest } from '../models/VoucherRequest.js';

const router = Router();

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  unreadOnly: z.coerce.boolean().optional().default(false),
});

const toRequestResponse = (request: any, username = 'Anonymous') => ({
  id: request._id.toString(),
  userId: request.userId.toString(),
  username,
  title: request.title,
  description: request.description,
  category: request.category,
  responses: request.responses,
  isActive: request.isActive,
  createdAt: request.createdAt,
});

const toNotificationResponse = (notification: any) => ({
  id: notification._id.toString(),
  userId: notification.userId.toString(),
  type: notification.type,
  title: notification.title,
  message: notification.message,
  relatedVoucherId: notification.relatedVoucherId?.toString?.() ?? undefined,
  isRead: notification.isRead,
  createdAt: notification.createdAt,
});

const toActivityResponse = (activity: any, username = 'Anonymous') => ({
  id: activity._id.toString(),
  userId: activity.userId.toString(),
  username,
  activityType: activity.activityType,
  entityId: activity.entityId.toString(),
  entityType: activity.entityType,
  title: activity.title,
  description: activity.description,
  createdAt: activity.createdAt,
});

router.get('/requests', asyncRoute(async (req, res) => {
  await connectDb();
  const { limit, offset } = listQuerySchema.parse(req.query);
  const requests = await VoucherRequest
    .find()
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit);
  const users = await User.find({ _id: { $in: requests.map((request: any) => request.userId) } });
  const names = new Map<string, string>(users.map((user: any) => [user._id.toString(), user.username]));

  ok(res, {
    requests: requests.map((request: any) => toRequestResponse(request, names.get(request.userId.toString()))),
  });
}));

router.post('/requests', requireAuth, asyncRoute(async (req, res) => {
  await connectDb();
  const input = z.object({
    title: z.string().min(1).max(120),
    description: z.string().min(1).max(1000),
    category: z.string().min(1),
  }).strict().parse(req.body);

  const requestDoc = await VoucherRequest.create({ ...input, userId: (req as AuthedRequest).userId });
  ok(res, { request: toRequestResponse(requestDoc) }, 201);
}));

router.get('/notifications', requireAuth, asyncRoute(async (req, res) => {
  await connectDb();
  const { limit, offset, unreadOnly } = listQuerySchema.parse(req.query);
  const filter: Record<string, unknown> = { userId: (req as AuthedRequest).userId };
  if (unreadOnly) filter.isRead = false;
  const notifications = await Notification
    .find(filter)
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit);
  ok(res, { notifications: notifications.map(toNotificationResponse) });
}));

router.patch('/notifications/:id/read', requireAuth, asyncRoute(async (req, res) => {
  await connectDb();
  const notificationId = req.params.id;
  if (!mongoose.isValidObjectId(notificationId)) {
    throw new ApiError(400, 'Invalid notification id');
  }
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId: (req as AuthedRequest).userId },
    { isRead: true },
    { new: true }
  );
  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }
  ok(res, { notification: toNotificationResponse(notification) });
}));

router.get('/leaderboard', asyncRoute(async (_req, res) => {
  await connectDb();
  const rows = await Voucher.aggregate([
    { $match: { isActive: true, isRedeemed: false } },
    { $group: { _id: '$donatedBy', donationCount: { $sum: 1 }, totalDonated: { $sum: 1 } } },
    { $sort: { donationCount: -1 } },
    { $limit: 10 },
  ]);
  const users = await User.find({ _id: { $in: rows.map((row: any) => row._id) } });
  const byId = new Map<string, any>(users.map((user: any) => [user._id.toString(), user]));

  ok(res, {
    contributors: rows.map((row: any) => {
      const user = byId.get(row._id.toString());
      return {
        id: row._id.toString(),
        username: user?.username ?? 'Anonymous',
        profileImage: user?.profileImage ?? undefined,
        donationCount: row.donationCount,
        totalDonated: row.totalDonated,
      };
    }),
  });
}));

router.get('/activities', asyncRoute(async (req, res) => {
  await connectDb();
  const { limit, offset } = listQuerySchema.parse(req.query);
  const activities = await Activity
    .find()
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit);
  const users = await User.find({ _id: { $in: activities.map((activity: any) => activity.userId) } });
  const names = new Map<string, string>(users.map((user: any) => [user._id.toString(), user.username]));
  ok(res, {
    activities: activities.map((activity: any) => toActivityResponse(activity, names.get(activity.userId.toString()))),
  });
}));

export { router as communityRouter };

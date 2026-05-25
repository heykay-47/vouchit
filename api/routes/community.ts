import { Router } from 'express';
import { z } from 'zod';
import { connectDb } from '../lib/db';
import { asyncRoute, ok } from '../lib/http';
import { requireAuth, type AuthedRequest } from '../middleware/auth';
import { Activity } from '../models/Activity';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { Voucher } from '../models/Voucher';
import { VoucherRequest } from '../models/VoucherRequest';

const router = Router();

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

const toActivityResponse = (activity: any) => ({
  id: activity._id.toString(),
  userId: activity.userId.toString(),
  activityType: activity.activityType,
  entityId: activity.entityId.toString(),
  entityType: activity.entityType,
  title: activity.title,
  description: activity.description,
  createdAt: activity.createdAt,
});

router.get('/requests', asyncRoute(async (_req, res) => {
  await connectDb();
  const requests = await VoucherRequest.find().sort({ createdAt: -1 });
  const users = await User.find({ _id: { $in: requests.map((request: any) => request.userId) } });
  const names = new Map(users.map((user: any) => [user._id.toString(), user.username]));

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
  }).parse(req.body);

  const requestDoc = await VoucherRequest.create({ ...input, userId: (req as AuthedRequest).userId });
  ok(res, { request: toRequestResponse(requestDoc) }, 201);
}));

router.get('/notifications', requireAuth, asyncRoute(async (req, res) => {
  await connectDb();
  const notifications = await Notification.find({ userId: (req as AuthedRequest).userId }).sort({ createdAt: -1 });
  ok(res, { notifications: notifications.map(toNotificationResponse) });
}));

router.patch('/notifications/:id/read', requireAuth, asyncRoute(async (req, res) => {
  await connectDb();
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: (req as AuthedRequest).userId },
    { isRead: true },
    { new: true }
  );
  ok(res, { notification: notification ? toNotificationResponse(notification) : null });
}));

router.get('/leaderboard', asyncRoute(async (_req, res) => {
  await connectDb();
  const rows = await Voucher.aggregate([
    { $group: { _id: '$donatedBy', donationCount: { $sum: 1 }, totalDonated: { $sum: 1 } } },
    { $sort: { donationCount: -1 } },
    { $limit: 10 },
  ]);
  const users = await User.find({ _id: { $in: rows.map((row: any) => row._id) } });
  const byId = new Map(users.map((user: any) => [user._id.toString(), user]));

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

router.get('/activities', asyncRoute(async (_req, res) => {
  await connectDb();
  const activities = await Activity.find().sort({ createdAt: -1 }).limit(50);
  ok(res, { activities: activities.map(toActivityResponse) });
}));

export { router as communityRouter };

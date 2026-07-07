import { Router } from 'express';
import { z } from 'zod';
import { connectDb } from '../lib/db.js';
import { ApiError, asyncRoute, ok } from '../lib/http.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { clearAuthCookie, createAuthCookie, signAuthToken } from '../lib/token.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { toUserResponse } from '../lib/serializers.js';
import { User } from '../models/User.js';

const router = Router();

const signupSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase().trim()),
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(6),
  rememberMe: z.boolean().optional().default(false),
});

const loginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase().trim()),
  password: z.string().min(1),
  rememberMe: z.boolean().optional().default(false),
});

router.post('/signup', asyncRoute(async (req, res) => {
  await connectDb();
  const input = signupSchema.parse(req.body);

  const existing = await User.findOne({ email: input.email });
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const user = await User.create({
    email: input.email,
    username: input.username,
    passwordHash: await hashPassword(input.password),
  });

  const token = signAuthToken({ userId: user._id.toString() }, input.rememberMe ? '30d' : '12h');
  res.setHeader('Set-Cookie', createAuthCookie(token, input.rememberMe));
  ok(res, { user: await toUserResponse(user) }, 201);
}));

router.post('/login', asyncRoute(async (req, res) => {
  await connectDb();
  const input = loginSchema.parse(req.body);
  const user = await User.findOne({ email: input.email });

  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = signAuthToken({ userId: user._id.toString() }, input.rememberMe ? '30d' : '12h');
  res.setHeader('Set-Cookie', createAuthCookie(token, input.rememberMe));
  ok(res, { user: await toUserResponse(user) });
}));

router.post('/logout', (_req, res) => {
  res.setHeader('Set-Cookie', clearAuthCookie());
  ok(res, { success: true });
});

router.get('/me', requireAuth, asyncRoute(async (req, res) => {
  await connectDb();
  const user = await User.findById((req as AuthedRequest).userId);
  if (!user) {
    throw new ApiError(401, 'Authentication required');
  }
  ok(res, { user: await toUserResponse(user) });
}));

export { router as authRouter };

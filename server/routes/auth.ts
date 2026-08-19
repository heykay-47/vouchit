import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { connectDb } from '../lib/db.js';
import { ApiError, asyncRoute, ok } from '../lib/http.js';
import { hashPassword } from '../lib/password.js';
import { clearAuthCookie, createAuthCookie, signAuthToken } from '../lib/token.js';
import { requireAuth, type AuthedRequest } from '../middleware/auth.js';
import { toUserResponse } from '../lib/serializers.js';
import { withTransaction } from '../lib/transaction.js';
import { BusinessProfile } from '../models/BusinessProfile.js';
import { User } from '../models/User.js';

const router = Router();

const baseSignup = z.object({
  email: z.string().email().transform((value) => value.toLowerCase().trim()),
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(8).max(72),
  rememberMe: z.boolean().optional().default(false),
});

const signupSchema = z.discriminatedUnion('role', [
  baseSignup.extend({ role: z.literal('customer') }).strict(),
  baseSignup.extend({
    role: z.literal('business'),
    organizationName: z.string().trim().min(1).max(120),
    contactName: z.string().trim().min(1).max(120),
    website: z.string().url().refine((value) => value.startsWith('https://')).optional(),
  }).strict(),
]);

const loginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase().trim()),
  password: z.string().min(1),
  rememberMe: z.boolean().optional().default(false),
}).strict();

// Constant-time-ish login: always run bcrypt even when user is missing so the
// response time does not reveal whether an email is registered.
const DUMMY_HASH = '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

router.post('/signup', asyncRoute(async (req, res) => {
  await connectDb();
  const input = signupSchema.parse(req.body);

  const existing = await User.findOne({ email: input.email });
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const user = await withTransaction(async (session) => {
    let createdUser;
    try {
      createdUser = await User.create({
        email: input.email,
        username: input.username,
        role: input.role,
        passwordHash: await hashPassword(input.password),
      }, { session });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw new ApiError(409, 'An account with this email already exists');
      }
      throw error;
    }

    if (input.role === 'business') {
      await BusinessProfile.create({
        userId: createdUser._id,
        organizationName: input.organizationName,
        contactName: input.contactName,
        website: input.website,
      }, { session });
    }

    return createdUser;
  });

  const token = signAuthToken({ userId: user._id.toString() }, input.rememberMe ? '7d' : '12h');
  const userResponse = await toUserResponse(user);
  res.setHeader('Set-Cookie', createAuthCookie(token, input.rememberMe));
  ok(res, { user: userResponse }, 201);
}));

router.post('/login', asyncRoute(async (req, res) => {
  await connectDb();
  const input = loginSchema.parse(req.body);
  const user = await User.findOne({ email: input.email });

  const hashToVerify = user?.passwordHash ?? DUMMY_HASH;
  const valid = await bcrypt.compare(input.password, hashToVerify);

  if (!user || !valid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = signAuthToken({ userId: user._id.toString() }, input.rememberMe ? '7d' : '12h');
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

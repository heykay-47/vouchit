# MERN Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Supabase with a free Vercel serverless Node API and MongoDB Atlas backend while preserving the current VoucherSwap feature set.

**Architecture:** Keep the Vite React frontend and migrate data access behind local API service wrappers. Add a Vercel catch-all serverless API in `api/[...path].ts`, with route modules, Mongoose models, JWT cookie auth, and Zod validation. Use MongoDB Atlas M0 for production and `MONGODB_URI` locally.

**Tech Stack:** React 18, Vite, TypeScript, Tailwind, React Query, Vercel Serverless Functions, Express, Mongoose, MongoDB Atlas, bcryptjs, jsonwebtoken, cookie, zod, Vitest, Supertest.

---

## File Structure

Create backend files:

- `api/[...path].ts`: Vercel catch-all function exporting the Express app handler.
- `api/app.ts`: Express app composition, middleware, and route mounting.
- `api/lib/db.ts`: cached MongoDB connection.
- `api/lib/http.ts`: success/error JSON helpers and async route wrapper.
- `api/lib/password.ts`: bcrypt hash/verify helpers.
- `api/lib/token.ts`: JWT sign/verify and cookie helpers.
- `api/middleware/auth.ts`: require authenticated user.
- `api/middleware/error-handler.ts`: final API error handler.
- `api/models/User.ts`: user schema/model.
- `api/models/Voucher.ts`: voucher schema/model.
- `api/models/Favorite.ts`: favorite schema/model.
- `api/models/RedeemedVoucher.ts`: redeemed-voucher schema/model.
- `api/models/ReportedVoucher.ts`: reported-voucher schema/model.
- `api/models/Comment.ts`: comment schema/model.
- `api/models/VoucherRequest.ts`: request schema/model.
- `api/models/Notification.ts`: notification schema/model.
- `api/models/Activity.ts`: activity schema/model.
- `api/routes/auth.ts`: signup/login/logout/me.
- `api/routes/users.ts`: profile, preferences, favorites.
- `api/routes/vouchers.ts`: list/create/redeem/report/comments.
- `api/routes/community.ts`: requests, notifications, leaderboard, activities.
- `api/**/*.test.ts`: backend unit and route tests.

Modify frontend/config files:

- `package.json`: add backend/runtime/test dependencies and scripts.
- `tsconfig.json`: include `api`.
- `vercel.json`: preserve SPA routing while allowing API functions.
- `README.md`: replace Supabase setup with MongoDB Atlas/Vercel setup.
- `src/services/api-client.ts`: new frontend fetch wrapper.
- `src/services/auth.service.ts`: replace Supabase auth with API calls.
- `src/services/voucher.service.ts`: voucher API wrapper.
- `src/services/community.service.ts`: comments, requests, notifications, leaderboard, activities.
- `src/contexts/AuthContext.tsx`: build user from `/api/auth/me`, remove Supabase listener.
- `src/contexts/VoucherContext.tsx`: remove Supabase realtime channel.
- `src/hooks/useVouchersQuery.ts`: fetch vouchers via service.
- `src/hooks/useVoucherOperations.ts`: mutate vouchers via service.
- `src/hooks/useNotificationService.tsx`: use notification API.
- `src/components/AuthModal.tsx`: remove Google sign-in button.
- `src/components/auth/GoogleSignInButton.tsx`: delete after removing all imports.
- `src/pages/AuthCallback.tsx`: remove route usage or replace with redirect to `/`.
- `src/App.tsx`: remove `/auth/callback` route.
- Direct Supabase callers: `CommentSystem.tsx`, `FavoriteVouchers.tsx`, `Leaderboard.tsx`, `UserActivityFeed.tsx`, `UserNotifications.tsx`, `RequestSystem.tsx`, `UserProfile.tsx`, `UserSettings.tsx`, `NotificationPreferences.tsx`.

---

### Task 1: Dependencies, Scripts, and Vercel Routing

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Modify: `vercel.json`
- Create: `.env.example`

- [ ] **Step 1: Add dependencies and scripts**

Edit `package.json` dependencies:

```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cookie": "^0.6.0",
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.8.0",
    "serverless-http": "^3.2.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cookie": "^0.6.0",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/supertest": "^6.0.2",
    "supertest": "^7.0.0",
    "vitest": "^2.1.8"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Keep all existing dependencies and scripts. Merge these keys rather than replacing the file.

- [ ] **Step 2: Install packages**

Run:

```bash
npm install
```

Expected: `package-lock.json` updates and install exits `0`.

- [ ] **Step 3: Include backend TypeScript files**

Update `tsconfig.json` so `include` contains both frontend and backend files:

```json
{
  "include": ["src", "api", "vite.config.ts"]
}
```

If the file already has a broader include list, add `api` without removing existing valid entries.

- [ ] **Step 4: Preserve API routes in Vercel config**

Replace `vercel.json` with:

```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/[...path]"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

- [ ] **Step 5: Add environment template**

Create `.env.example`:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/voucherswap
JWT_SECRET=replace-with-a-long-random-string
NODE_ENV=development
```

- [ ] **Step 6: Verify install and type config**

Run:

```bash
npm run type-check
```

Expected at this point: existing project type-check result, plus no error saying `api` is outside TypeScript config.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json vercel.json .env.example
git commit -m "chore: add MERN backend dependencies"
```

---

### Task 2: API Foundation

**Files:**
- Create: `api/lib/http.ts`
- Create: `api/lib/db.ts`
- Create: `api/lib/password.ts`
- Create: `api/lib/token.ts`
- Create: `api/middleware/error-handler.ts`
- Create: `api/app.ts`
- Create: `api/[...path].ts`
- Create: `api/lib/token.test.ts`

- [ ] **Step 1: Write JWT helper test**

Create `api/lib/token.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createAuthCookie, signAuthToken, verifyAuthToken } from './token';

describe('token helpers', () => {
  it('signs and verifies an auth token', () => {
    const token = signAuthToken({ userId: '507f1f77bcf86cd799439011' }, '1h');
    expect(verifyAuthToken(token)).toEqual({ userId: '507f1f77bcf86cd799439011' });
  });

  it('creates an httpOnly auth cookie', () => {
    const cookie = createAuthCookie('abc.def.ghi', true);
    expect(cookie).toContain('auth_token=abc.def.ghi');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Max-Age=');
  });
});
```

- [ ] **Step 2: Run failing token test**

Run:

```bash
npm test -- api/lib/token.test.ts
```

Expected: FAIL because `api/lib/token.ts` does not exist.

- [ ] **Step 3: Add HTTP helpers**

Create `api/lib/http.ts`:

```ts
import type { NextFunction, Request, Response } from 'express';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const ok = <T>(res: Response, data: T, status = 200) => {
  return res.status(status).json({ data, error: null });
};

export const fail = (res: Response, status: number, message: string) => {
  return res.status(status).json({ data: null, error: { message } });
};

export const asyncRoute = (
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
};
```

- [ ] **Step 4: Add Mongo connection helper**

Create `api/lib/db.ts`:

```ts
import mongoose from 'mongoose';

let cached = globalThis as typeof globalThis & {
  mongooseConnection?: Promise<typeof mongoose>;
};

export const connectDb = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required');
  }

  if (!cached.mongooseConnection) {
    cached.mongooseConnection = mongoose.connect(process.env.MONGODB_URI, {
      bufferCommands: false,
    });
  }

  return cached.mongooseConnection;
};
```

- [ ] **Step 5: Add password helper**

Create `api/lib/password.ts`:

```ts
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export const hashPassword = async (password: string) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const verifyPassword = async (password: string, hash: string) => {
  return bcrypt.compare(password, hash);
};
```

- [ ] **Step 6: Add token helper**

Create `api/lib/token.ts`:

```ts
import { serialize } from 'cookie';
import jwt from 'jsonwebtoken';

export type AuthTokenPayload = {
  userId: string;
};

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required');
  }
  return process.env.JWT_SECRET;
};

export const signAuthToken = (payload: AuthTokenPayload, expiresIn: string | number) => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn });
};

export const verifyAuthToken = (token: string): AuthTokenPayload => {
  const decoded = jwt.verify(token, getJwtSecret());
  if (typeof decoded === 'string' || !decoded.userId) {
    throw new Error('Invalid auth token');
  }
  return { userId: String(decoded.userId) };
};

export const createAuthCookie = (token: string, rememberMe: boolean) => {
  return serialize('auth_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: rememberMe ? 60 * 60 * 24 * 30 : undefined,
  });
};

export const clearAuthCookie = () => {
  return serialize('auth_token', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
};
```

- [ ] **Step 7: Add error handler**

Create `api/middleware/error-handler.ts`:

```ts
import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { ApiError, fail } from '../lib/http';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ApiError) {
    fail(res, error.status, error.message);
    return;
  }

  if (error instanceof ZodError) {
    fail(res, 400, error.issues[0]?.message ?? 'Invalid request');
    return;
  }

  fail(res, 500, 'Internal server error');
};
```

- [ ] **Step 8: Add app and serverless entry**

Create `api/app.ts`:

```ts
import express from 'express';
import { errorHandler } from './middleware/error-handler';

export const createApp = () => {
  const app = express();

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ data: { ok: true }, error: null });
  });

  app.use(errorHandler);

  return app;
};
```

Create `api/[...path].ts`:

```ts
import serverless from 'serverless-http';
import { createApp } from './app';

export default serverless(createApp());
```

- [ ] **Step 9: Run foundation tests**

Run:

```bash
JWT_SECRET=test-secret npm test -- api/lib/token.test.ts
```

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add api
git commit -m "feat: add serverless API foundation"
```

---

### Task 3: Mongoose Models

**Files:**
- Create: `api/models/User.ts`
- Create: `api/models/Voucher.ts`
- Create: `api/models/Favorite.ts`
- Create: `api/models/RedeemedVoucher.ts`
- Create: `api/models/ReportedVoucher.ts`
- Create: `api/models/Comment.ts`
- Create: `api/models/VoucherRequest.ts`
- Create: `api/models/Notification.ts`
- Create: `api/models/Activity.ts`
- Create: `api/models/model.test.ts`

- [ ] **Step 1: Write model index test**

Create `api/models/model.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { User } from './User';
import { Voucher } from './Voucher';
import { Favorite } from './Favorite';
import { ReportedVoucher } from './ReportedVoucher';

describe('mongoose models', () => {
  it('defines core collection names', () => {
    expect(User.collection.name).toBe('users');
    expect(Voucher.collection.name).toBe('vouchers');
    expect(Favorite.collection.name).toBe('favorites');
    expect(ReportedVoucher.collection.name).toBe('reportedvouchers');
  });

  it('sets voucher defaults', () => {
    const voucher = new Voucher({
      platform: 'Google Pay',
      title: 'Test',
      description: 'Desc',
      code: 'SAVE10',
      imageUrl: 'data:image/png;base64,abc',
      donatedBy: '507f1f77bcf86cd799439011',
    });

    expect(voucher.isRedeemed).toBe(false);
    expect(voucher.reportCount).toBe(0);
    expect(voucher.isActive).toBe(true);
  });
});
```

- [ ] **Step 2: Run failing model test**

Run:

```bash
npm test -- api/models/model.test.ts
```

Expected: FAIL because model files do not exist.

- [ ] **Step 3: Add user model**

Create `api/models/User.ts`:

```ts
import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const notificationPreferencesSchema = new Schema(
  {
    email: { type: Boolean, default: true },
    newVouchers: { type: Boolean, default: true },
    voucherExpiry: { type: Boolean, default: true },
    systemUpdates: { type: Boolean, default: true },
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    username: { type: String, required: true, trim: true, minlength: 3, maxlength: 50 },
    bio: { type: String, default: null },
    profileImage: { type: String, default: null },
    notificationPreferences: { type: notificationPreferencesSchema, default: () => ({}) },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: mongoose.Types.ObjectId };
export const User = mongoose.models.User || mongoose.model('User', userSchema);
```

- [ ] **Step 4: Add voucher and relation models**

Create `api/models/Voucher.ts`:

```ts
import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const voucherSchema = new Schema(
  {
    platform: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true },
    imageUrl: { type: String, required: true },
    expiryDate: { type: Date, default: null },
    value: { type: String, default: null },
    donatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    donatedAt: { type: Date, default: Date.now },
    isRedeemed: { type: Boolean, default: false },
    redeemedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    redeemedAt: { type: Date, default: null },
    reportCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    category: { type: String, default: null },
  },
  { timestamps: true }
);

export type VoucherDocument = InferSchemaType<typeof voucherSchema> & { _id: mongoose.Types.ObjectId };
export const Voucher = mongoose.models.Voucher || mongoose.model('Voucher', voucherSchema);
```

Create `api/models/Favorite.ts`:

```ts
import mongoose, { Schema } from 'mongoose';

const favoriteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    voucherId: { type: Schema.Types.ObjectId, ref: 'Voucher', required: true },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

favoriteSchema.index({ userId: 1, voucherId: 1 }, { unique: true });

export const Favorite = mongoose.models.Favorite || mongoose.model('Favorite', favoriteSchema);
```

Create `api/models/RedeemedVoucher.ts`:

```ts
import mongoose, { Schema } from 'mongoose';

const redeemedVoucherSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    voucherId: { type: Schema.Types.ObjectId, ref: 'Voucher', required: true },
    redeemedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

redeemedVoucherSchema.index({ userId: 1, voucherId: 1 }, { unique: true });

export const RedeemedVoucher =
  mongoose.models.RedeemedVoucher || mongoose.model('RedeemedVoucher', redeemedVoucherSchema);
```

Create `api/models/ReportedVoucher.ts`:

```ts
import mongoose, { Schema } from 'mongoose';

const reportedVoucherSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    voucherId: { type: Schema.Types.ObjectId, ref: 'Voucher', required: true },
    reportedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

reportedVoucherSchema.index({ userId: 1, voucherId: 1 }, { unique: true });

export const ReportedVoucher =
  mongoose.models.ReportedVoucher || mongoose.model('ReportedVoucher', reportedVoucherSchema);
```

- [ ] **Step 5: Add community models**

Create `api/models/Comment.ts`:

```ts
import mongoose, { Schema } from 'mongoose';

const commentSchema = new Schema(
  {
    voucherId: { type: Schema.Types.ObjectId, ref: 'Voucher', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

export const Comment = mongoose.models.Comment || mongoose.model('Comment', commentSchema);
```

Create `api/models/VoucherRequest.ts`:

```ts
import mongoose, { Schema } from 'mongoose';

const voucherRequestSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    responses: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: true } }
);

export const VoucherRequest =
  mongoose.models.VoucherRequest || mongoose.model('VoucherRequest', voucherRequestSchema);
```

Create `api/models/Notification.ts`:

```ts
import mongoose, { Schema } from 'mongoose';

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, required: true },
    voucherId: { type: Schema.Types.ObjectId, ref: 'Voucher', default: null },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

export const Notification =
  mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
```

Create `api/models/Activity.ts`:

```ts
import mongoose, { Schema } from 'mongoose';

const activitySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    activityType: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    entityType: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

export const Activity = mongoose.models.Activity || mongoose.model('Activity', activitySchema);
```

- [ ] **Step 6: Run model test**

Run:

```bash
npm test -- api/models/model.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add api/models
git commit -m "feat: add MongoDB models"
```

---

### Task 4: Authentication API

**Files:**
- Create: `api/middleware/auth.ts`
- Create: `api/routes/auth.ts`
- Modify: `api/app.ts`
- Create: `api/routes/auth.test.ts`

- [ ] **Step 1: Write auth route tests with model mocks**

Create `api/routes/auth.test.ts`:

```ts
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app';

const users = new Map<string, any>();

vi.mock('../lib/db', () => ({ connectDb: vi.fn(async () => undefined) }));
vi.mock('../models/User', () => ({
  User: {
    findOne: vi.fn(async (query: any) => {
      if (query.email) return users.get(query.email) ?? null;
      return null;
    }),
    findById: vi.fn(async (id: string) => {
      return Array.from(users.values()).find((user) => user._id.toString() === id) ?? null;
    }),
    create: vi.fn(async (doc: any) => {
      const user = {
        _id: { toString: () => '507f1f77bcf86cd799439011' },
        ...doc,
        createdAt: new Date('2026-05-20T00:00:00.000Z'),
      };
      users.set(doc.email, user);
      return user;
    }),
  },
}));

describe('auth routes', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    users.clear();
  });

  it('signs up and returns current user', async () => {
    const res = await request(createApp())
      .post('/api/auth/signup')
      .send({ email: 'student@example.com', username: 'student', password: 'secret1', rememberMe: true })
      .expect(201);

    expect(res.body.data.user.email).toBe('student@example.com');
    expect(res.headers['set-cookie'][0]).toContain('auth_token=');
  });

  it('rejects duplicate email', async () => {
    await request(createApp())
      .post('/api/auth/signup')
      .send({ email: 'student@example.com', username: 'student', password: 'secret1' });

    const res = await request(createApp())
      .post('/api/auth/signup')
      .send({ email: 'student@example.com', username: 'other', password: 'secret1' })
      .expect(409);

    expect(res.body.error.message).toBe('An account with this email already exists');
  });
});
```

- [ ] **Step 2: Run failing auth tests**

Run:

```bash
npm test -- api/routes/auth.test.ts
```

Expected: FAIL because `api/routes/auth.ts` is missing.

- [ ] **Step 3: Add auth middleware**

Create `api/middleware/auth.ts`:

```ts
import type { NextFunction, Request, Response } from 'express';
import { parse } from 'cookie';
import { ApiError } from '../lib/http';
import { verifyAuthToken } from '../lib/token';

export type AuthedRequest = Request & {
  userId: string;
};

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  const cookies = parse(req.headers.cookie ?? '');
  const token = cookies.auth_token;

  if (!token) {
    next(new ApiError(401, 'Authentication required'));
    return;
  }

  try {
    const payload = verifyAuthToken(token);
    (req as AuthedRequest).userId = payload.userId;
    next();
  } catch {
    next(new ApiError(401, 'Authentication required'));
  }
};
```

- [ ] **Step 4: Add auth routes**

Create `api/routes/auth.ts`:

```ts
import { Router } from 'express';
import { z } from 'zod';
import { connectDb } from '../lib/db';
import { ApiError, asyncRoute, ok } from '../lib/http';
import { hashPassword, verifyPassword } from '../lib/password';
import { clearAuthCookie, createAuthCookie, signAuthToken } from '../lib/token';
import { requireAuth, type AuthedRequest } from '../middleware/auth';
import { User } from '../models/User';

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

const toUserResponse = (user: any) => ({
  id: user._id.toString(),
  email: user.email,
  username: user.username,
  bio: user.bio ?? undefined,
  profileImage: user.profileImage ?? undefined,
  notificationPreferences: user.notificationPreferences,
  createdAt: user.createdAt,
  favorites: [],
  redeemedVouchers: [],
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
  ok(res, { user: toUserResponse(user) }, 201);
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
  ok(res, { user: toUserResponse(user) });
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
  ok(res, { user: toUserResponse(user) });
}));

export { router as authRouter };
```

- [ ] **Step 5: Mount auth router**

Modify `api/app.ts`:

```ts
import express from 'express';
import { authRouter } from './routes/auth';
import { errorHandler } from './middleware/error-handler';

export const createApp = () => {
  const app = express();

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ data: { ok: true }, error: null });
  });

  app.use('/api/auth', authRouter);

  app.use(errorHandler);

  return app;
};
```

- [ ] **Step 6: Run auth tests**

Run:

```bash
JWT_SECRET=test-secret npm test -- api/routes/auth.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add api
git commit -m "feat: add email password auth API"
```

---

### Task 5: Voucher API

**Files:**
- Create: `api/routes/vouchers.ts`
- Modify: `api/app.ts`
- Create: `api/routes/vouchers.test.ts`

- [ ] **Step 1: Write voucher route test for protected create**

Create `api/routes/vouchers.test.ts`:

```ts
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app';
import { signAuthToken } from '../lib/token';

const vouchers: any[] = [];

vi.mock('../lib/db', () => ({ connectDb: vi.fn(async () => undefined) }));
vi.mock('../models/Voucher', () => ({
  Voucher: {
    find: vi.fn(() => ({ sort: () => ({ limit: async () => vouchers }) })),
    create: vi.fn(async (doc: any) => {
      const voucher = {
        _id: { toString: () => '507f1f77bcf86cd799439012' },
        ...doc,
        donatedAt: new Date('2026-05-20T00:00:00.000Z'),
        isRedeemed: false,
        reportCount: 0,
        isActive: true,
      };
      vouchers.push(voucher);
      return voucher;
    }),
  },
}));

describe('voucher routes', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    vouchers.length = 0;
  });

  it('creates a voucher for an authenticated user', async () => {
    const token = signAuthToken({ userId: '507f1f77bcf86cd799439011' }, '1h');

    const res = await request(createApp())
      .post('/api/vouchers')
      .set('Cookie', [`auth_token=${token}`])
      .send({
        platform: 'Google Pay',
        title: 'Save 10',
        description: 'Ten off',
        code: 'SAVE10',
        imageUrl: 'data:image/png;base64,abc',
        category: 'Shopping',
      })
      .expect(201);

    expect(res.body.data.voucher.title).toBe('Save 10');
    expect(res.body.data.voucher.donatedBy).toBe('507f1f77bcf86cd799439011');
  });
});
```

- [ ] **Step 2: Run failing voucher test**

Run:

```bash
JWT_SECRET=test-secret npm test -- api/routes/vouchers.test.ts
```

Expected: FAIL because `api/routes/vouchers.ts` is missing.

- [ ] **Step 3: Add voucher routes**

Create `api/routes/vouchers.ts`:

```ts
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
  }).catch(() => undefined);

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
```

- [ ] **Step 4: Mount voucher router**

Modify `api/app.ts` imports and route mounting:

```ts
import { vouchersRouter } from './routes/vouchers';

app.use('/api/vouchers', vouchersRouter);
```

Place the route before `app.use(errorHandler)`.

- [ ] **Step 5: Run voucher tests**

Run:

```bash
JWT_SECRET=test-secret npm test -- api/routes/vouchers.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add api
git commit -m "feat: add voucher API"
```

---

### Task 6: User and Community API

**Files:**
- Create: `api/routes/users.ts`
- Create: `api/routes/community.ts`
- Modify: `api/app.ts`
- Create: `api/routes/community.test.ts`

- [ ] **Step 1: Write community route test**

Create `api/routes/community.test.ts`:

```ts
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app';

const requests: any[] = [];

vi.mock('../lib/db', () => ({ connectDb: vi.fn(async () => undefined) }));
vi.mock('../models/VoucherRequest', () => ({
  VoucherRequest: {
    find: vi.fn(() => ({ sort: async () => requests })),
    create: vi.fn(async (doc: any) => {
      const requestDoc = {
        _id: { toString: () => '507f1f77bcf86cd799439020' },
        ...doc,
        responses: 0,
        isActive: true,
        createdAt: new Date('2026-05-20T00:00:00.000Z'),
      };
      requests.push(requestDoc);
      return requestDoc;
    }),
  },
}));
vi.mock('../models/User', () => ({ User: { find: vi.fn(async () => []) } }));
vi.mock('../models/Notification', () => ({ Notification: { find: vi.fn(() => ({ sort: async () => [] })) } }));
vi.mock('../models/Activity', () => ({ Activity: { find: vi.fn(() => ({ sort: () => ({ limit: async () => [] }) })) } }));
vi.mock('../models/Voucher', () => ({ Voucher: { aggregate: vi.fn(async () => []) } }));

describe('community routes', () => {
  beforeEach(() => {
    requests.length = 0;
  });

  it('lists voucher requests', async () => {
    requests.push({
      _id: { toString: () => '507f1f77bcf86cd799439020' },
      userId: { toString: () => '507f1f77bcf86cd799439011' },
      title: 'Need food voucher',
      description: 'Any grocery coupon',
      category: 'Food',
      responses: 0,
      isActive: true,
      createdAt: new Date('2026-05-20T00:00:00.000Z'),
    });

    const res = await request(createApp()).get('/api/requests').expect(200);
    expect(res.body.data.requests[0].title).toBe('Need food voucher');
  });
});
```

- [ ] **Step 2: Run failing community test**

Run:

```bash
npm test -- api/routes/community.test.ts
```

Expected: FAIL because community routes are missing.

- [ ] **Step 3: Add user routes**

Create `api/routes/users.ts`:

```ts
import { Router } from 'express';
import { z } from 'zod';
import { connectDb } from '../lib/db';
import { asyncRoute, ok } from '../lib/http';
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
  await Favorite.create({ userId: (req as AuthedRequest).userId, voucherId: req.params.voucherId }).catch(() => undefined);
  ok(res, { voucherId: req.params.voucherId });
}));

router.delete('/me/favorites/:voucherId', asyncRoute(async (req, res) => {
  await connectDb();
  await Favorite.deleteOne({ userId: (req as AuthedRequest).userId, voucherId: req.params.voucherId });
  ok(res, { voucherId: req.params.voucherId });
}));

export { router as usersRouter };
```

- [ ] **Step 4: Add community routes**

Create `api/routes/community.ts`:

```ts
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

router.get('/requests', asyncRoute(async (_req, res) => {
  await connectDb();
  const requests = await VoucherRequest.find().sort({ createdAt: -1 });
  const users = await User.find({ _id: { $in: requests.map((request: any) => request.userId) } });
  const names = new Map(users.map((user: any) => [user._id.toString(), user.username]));

  ok(res, {
    requests: requests.map((request: any) => ({
      id: request._id.toString(),
      userId: request.userId.toString(),
      username: names.get(request.userId.toString()) ?? 'Anonymous',
      title: request.title,
      description: request.description,
      category: request.category,
      responses: request.responses,
      isActive: request.isActive,
      createdAt: request.createdAt,
    })),
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
  ok(res, { request: requestDoc }, 201);
}));

router.get('/notifications', requireAuth, asyncRoute(async (req, res) => {
  await connectDb();
  const notifications = await Notification.find({ userId: (req as AuthedRequest).userId }).sort({ createdAt: -1 });
  ok(res, { notifications });
}));

router.patch('/notifications/:id/read', requireAuth, asyncRoute(async (req, res) => {
  await connectDb();
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: (req as AuthedRequest).userId },
    { isRead: true },
    { new: true }
  );
  ok(res, { notification });
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
  ok(res, { activities });
}));

export { router as communityRouter };
```

- [ ] **Step 5: Mount user and community routes**

Modify `api/app.ts`:

```ts
import { communityRouter } from './routes/community';
import { usersRouter } from './routes/users';

app.use('/api/users', usersRouter);
app.use('/api', communityRouter);
```

Place both route registrations before `app.use(errorHandler)`.

- [ ] **Step 6: Run community tests**

Run:

```bash
npm test -- api/routes/community.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add api
git commit -m "feat: add user and community APIs"
```

---

### Task 7: Frontend API Clients

**Files:**
- Create: `src/services/api-client.ts`
- Create: `src/services/voucher.service.ts`
- Create: `src/services/community.service.ts`
- Modify: `src/services/auth.service.ts`

- [ ] **Step 1: Add API client**

Create `src/services/api-client.ts`:

```ts
export type ApiEnvelope<T> = {
  data: T | null;
  error: { message: string } | null;
};

export class ApiClientError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const apiRequest = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  const envelope = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || envelope.error) {
    throw new ApiClientError(envelope.error?.message ?? 'Request failed', response.status);
  }

  return envelope.data as T;
};
```

- [ ] **Step 2: Replace auth service with API auth**

Replace the Supabase-dependent exports in `src/services/auth.service.ts` with:

```ts
import { User as AppUser } from '@/lib/types';
import { apiRequest } from './api-client';

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: AppUser;
  requiresEmailConfirmation?: boolean;
}

const authCall = async <T>(fn: () => Promise<T>): Promise<AuthResult & T> => {
  try {
    const data = await fn();
    return { success: true, ...data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    } as AuthResult & T;
  }
};

export const signUpWithEmail = async (
  email: string,
  password: string,
  username: string,
  rememberMe = false
): Promise<AuthResult> => {
  return authCall(() =>
    apiRequest<{ user: AppUser }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, username, rememberMe }),
    })
  );
};

export const signInWithEmail = async (
  email: string,
  password: string,
  rememberMe = false
): Promise<AuthResult> => {
  return authCall(() =>
    apiRequest<{ user: AppUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, rememberMe }),
    })
  );
};

export const signOut = async (): Promise<AuthResult> => {
  return authCall(() => apiRequest<{ success: boolean }>('/api/auth/logout', { method: 'POST' }));
};

export const getCurrentUser = async () => {
  return apiRequest<{ user: AppUser }>('/api/auth/me');
};

export const updateProfile = async (updates: Partial<AppUser>) => {
  const { user } = await apiRequest<{ user: AppUser }>('/api/users/me', {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return user;
};
```

- [ ] **Step 3: Add voucher service**

Create `src/services/voucher.service.ts`:

```ts
import { Voucher } from '@/lib/types';
import { apiRequest } from './api-client';

export const voucherService = {
  async list() {
    const { vouchers } = await apiRequest<{ vouchers: Voucher[] }>('/api/vouchers');
    return vouchers.map((voucher) => ({
      ...voucher,
      donatedAt: new Date(voucher.donatedAt),
      expiryDate: voucher.expiryDate ? new Date(voucher.expiryDate) : undefined,
      redeemedAt: voucher.redeemedAt ? new Date(voucher.redeemedAt) : undefined,
    }));
  },

  async donate(voucher: Omit<Voucher, 'id' | 'donatedAt' | 'reportCount' | 'isActive'>) {
    return apiRequest<{ voucher: Voucher }>('/api/vouchers', {
      method: 'POST',
      body: JSON.stringify(voucher),
    });
  },

  async redeem(voucherId: string) {
    return apiRequest<{ voucher: Voucher; message: string }>(`/api/vouchers/${voucherId}/redeem`, {
      method: 'POST',
    });
  },

  async report(voucherId: string) {
    return apiRequest<{ voucher: Voucher; message: string }>(`/api/vouchers/${voucherId}/report`, {
      method: 'POST',
    });
  },
};
```

- [ ] **Step 4: Add community service**

Create `src/services/community.service.ts`:

```ts
import { Comment, Contributor, Notification, VoucherRequest } from '@/lib/types';
import { apiRequest } from './api-client';

export const communityService = {
  async listComments(voucherId: string) {
    const { comments } = await apiRequest<{ comments: Comment[] }>(`/api/vouchers/${voucherId}/comments`);
    return comments.map((comment) => ({ ...comment, createdAt: new Date(comment.createdAt) }));
  },

  async addComment(voucherId: string, text: string) {
    return apiRequest<{ comment: Comment }>(`/api/vouchers/${voucherId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },

  async listRequests() {
    const { requests } = await apiRequest<{ requests: VoucherRequest[] }>('/api/requests');
    return requests.map((request) => ({ ...request, createdAt: new Date(request.createdAt) }));
  },

  async createRequest(input: Pick<VoucherRequest, 'title' | 'description' | 'category'>) {
    return apiRequest<{ request: VoucherRequest }>('/api/requests', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async listNotifications() {
    const { notifications } = await apiRequest<{ notifications: Notification[] }>('/api/notifications');
    return notifications.map((notification) => ({ ...notification, createdAt: new Date(notification.createdAt) }));
  },

  async markNotificationRead(id: string) {
    return apiRequest<{ notification: Notification }>(`/api/notifications/${id}/read`, { method: 'PATCH' });
  },

  async leaderboard() {
    const { contributors } = await apiRequest<{ contributors: Contributor[] }>('/api/leaderboard');
    return contributors;
  },

  async activities() {
    const { activities } = await apiRequest<{ activities: any[] }>('/api/activities');
    return activities.map((activity) => ({ ...activity, createdAt: new Date(activity.createdAt) }));
  },
};
```

- [ ] **Step 5: Type-check service layer**

Run:

```bash
npm run type-check
```

Expected: FAIL only where old Supabase callers still expect removed auth exports or direct Supabase integration.

- [ ] **Step 6: Commit**

```bash
git add src/services package.json package-lock.json
git commit -m "feat: add frontend API services"
```

---

### Task 8: Migrate Auth and Voucher State

**Files:**
- Modify: `src/contexts/AuthContext.tsx`
- Modify: `src/contexts/VoucherContext.tsx`
- Modify: `src/hooks/useVouchersQuery.ts`
- Modify: `src/hooks/useVoucherOperations.ts`
- Modify: `src/components/AuthModal.tsx`
- Modify: `src/App.tsx`
- Modify: `src/pages/AuthCallback.tsx`
- Delete: `src/components/auth/GoogleSignInButton.tsx`

- [ ] **Step 1: Replace voucher query hook**

Replace Supabase logic in `src/hooks/useVouchersQuery.ts` with:

```ts
import { useQuery } from '@tanstack/react-query';
import { voucherService } from '@/services/voucher.service';

export const vouchersQueryKey = ['vouchers'] as const;

export const useVouchersQuery = () => {
  return useQuery({
    queryKey: vouchersQueryKey,
    queryFn: voucherService.list,
    staleTime: 5 * 60 * 1000,
  });
};
```

- [ ] **Step 2: Replace voucher mutations**

In `src/hooks/useVoucherOperations.ts`, remove Supabase upload/RPC code and use:

```ts
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from '@/utils/toast';
import { Voucher } from '@/lib/types';
import { vouchersQueryKey } from '@/hooks/useVouchersQuery';
import { createLogger } from '@/utils/logger';
import { voucherService } from '@/services/voucher.service';

const voucherLogger = createLogger({ context: { component: 'useVoucherOperations' } });

type DonatePayload = Omit<Voucher, 'id' | 'donatedAt' | 'reportCount' | 'isActive'>;

export const useVoucherOperations = (setMutationError: (message: string | null) => void) => {
  const queryClient = useQueryClient();

  const donateMutation = useMutation({
    mutationFn: (voucherData: DonatePayload) => voucherService.donate(voucherData),
    onSuccess: () => {
      toast.success('Voucher donated successfully');
      setMutationError(null);
      queryClient.invalidateQueries({ queryKey: vouchersQueryKey });
    },
    onError: (error: Error) => {
      voucherLogger.error('Error donating voucher', error);
      setMutationError(error.message);
      toast.error(error.message || 'Failed to donate voucher');
    },
  });

  const redeemMutation = useMutation({
    mutationFn: (voucherId: string) => voucherService.redeem(voucherId),
    onSuccess: () => {
      toast.success('Voucher redeemed successfully');
      setMutationError(null);
      queryClient.invalidateQueries({ queryKey: vouchersQueryKey });
    },
    onError: (error: Error) => {
      voucherLogger.error('Error redeeming voucher', error);
      setMutationError(error.message);
      toast.error(error.message || 'Failed to redeem voucher');
    },
  });

  const reportMutation = useMutation({
    mutationFn: (voucherId: string) => voucherService.report(voucherId),
    onSuccess: () => {
      toast.success('Voucher reported as not working');
      setMutationError(null);
      queryClient.invalidateQueries({ queryKey: vouchersQueryKey });
    },
    onError: (error: Error) => {
      voucherLogger.error('Error reporting voucher', error);
      setMutationError(error.message);
      toast.error(error.message || 'Failed to report voucher');
    },
  });

  return {
    donateVoucher: (voucherData: DonatePayload) => donateMutation.mutateAsync(voucherData),
    redeemVoucher: (voucherId: string, userId?: string) => {
      if (!userId) {
        toast.error('You must be logged in to redeem vouchers');
        throw new Error('Authentication required');
      }
      return redeemMutation.mutateAsync(voucherId);
    },
    reportVoucher: (voucherId: string, userId?: string) => {
      if (!userId) {
        toast.error('You must be logged in to report vouchers');
        throw new Error('Authentication required');
      }
      return reportMutation.mutateAsync(voucherId);
    },
  };
};
```

- [ ] **Step 3: Remove voucher realtime subscription**

In `src/contexts/VoucherContext.tsx`, delete the `supabase` import and the `useEffect` that opens `supabase.channel('vouchers-changes')`.

- [ ] **Step 4: Simplify auth context initialization**

In `src/contexts/AuthContext.tsx`, remove Supabase imports and auth state listener. Initialize with `getCurrentUser()`:

```ts
useEffect(() => {
  let mounted = true;

  const initializeAuth = async () => {
    try {
      const { user } = await getCurrentUser();
      if (mounted) setUser(user);
    } catch {
      if (mounted) setUser(null);
    } finally {
      if (mounted) setIsLoading(false);
    }
  };

  initializeAuth();

  return () => {
    mounted = false;
  };
}, []);
```

Update `login`, `signup`, `logout`, and `updateProfile` to use the new service responses and assign `setUser(result.user ?? null)` after successful login/signup.

- [ ] **Step 5: Remove Google UI and callback route**

In `src/components/AuthModal.tsx`, remove:

```ts
import GoogleSignInButton from './auth/GoogleSignInButton';
```

Remove the `<GoogleSignInButton />` render block if present below the form.

In `src/App.tsx`, remove:

```ts
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
<Route path="/auth/callback" element={<AuthCallback />} />
```

Replace `src/pages/AuthCallback.tsx` content with a simple redirect component:

```tsx
import { Navigate } from 'react-router-dom';

export default function AuthCallback() {
  return <Navigate to="/" replace />;
}
```

Delete the unused Google button:

```bash
git rm src/components/auth/GoogleSignInButton.tsx
```

- [ ] **Step 6: Type-check auth/voucher migration**

Run:

```bash
npm run type-check
```

Expected: remaining failures only in components still importing Supabase directly.

- [ ] **Step 7: Commit**

```bash
git add src/contexts src/hooks src/components/AuthModal.tsx src/App.tsx src/pages/AuthCallback.tsx
git commit -m "feat: migrate auth and voucher state to API"
```

---

### Task 9: Migrate Community Components

**Files:**
- Modify: `src/components/CommentSystem.tsx`
- Modify: `src/components/RequestSystem.tsx`
- Modify: `src/components/UserNotifications.tsx`
- Modify: `src/hooks/useNotificationService.tsx`
- Modify: `src/components/NotificationPreferences.tsx`
- Modify: `src/components/UserSettings.tsx`
- Modify: `src/components/FavoriteVouchers.tsx`
- Modify: `src/components/Leaderboard.tsx`
- Modify: `src/components/UserActivityFeed.tsx`
- Modify: `src/components/UserProfile.tsx`

- [ ] **Step 1: Replace comments with service calls**

In `src/components/CommentSystem.tsx`, remove Supabase import/subscription. Use:

```ts
const fetchComments = async () => {
  try {
    setIsFetching(true);
    setComments(await communityService.listComments(voucherId));
  } catch (err) {
    toast.error('Failed to load comments');
    logger.error('Error fetching comments', err, { component: 'CommentSystem', action: 'fetchComments', voucherId });
  } finally {
    setIsFetching(false);
  }
};
```

For submit:

```ts
await communityService.addComment(voucherId, newComment.trim());
setNewComment('');
toast.success('Comment added successfully');
await fetchComments();
```

- [ ] **Step 2: Replace requests with service calls**

In `src/components/RequestSystem.tsx`, remove Supabase import/subscription. Fetch with:

```ts
const requests = await communityService.listRequests();
```

Create with:

```ts
await communityService.createRequest({
  title: formData.title,
  description: formData.description,
  category: formData.category,
});
```

Refetch after create.

- [ ] **Step 3: Replace notification service**

In `src/hooks/useNotificationService.tsx`, use `communityService.listNotifications()` and `communityService.markNotificationRead(id)`. Remove Supabase realtime subscription. Use `setInterval(fetchNotifications, 60000)` while authenticated and clear it in cleanup.

- [ ] **Step 4: Replace settings/preference calls**

In `src/components/UserSettings.tsx` and `src/components/NotificationPreferences.tsx`, replace Supabase preference updates with:

```ts
await apiRequest<{ notificationPreferences: NotificationPreferences }>('/api/users/me/preferences', {
  method: 'PATCH',
  body: JSON.stringify(preferences),
});
```

- [ ] **Step 5: Replace favorite calls**

In `src/contexts/AuthContext.tsx` or the current favorite action location, use:

```ts
await apiRequest(`/api/users/me/favorites/${voucherId}`, {
  method: user.favorites?.includes(voucherId) ? 'DELETE' : 'POST',
});
```

Then update local `user.favorites` optimistically.

- [ ] **Step 6: Replace leaderboard/activity/profile calls**

Use these service calls:

```ts
const contributors = await communityService.leaderboard();
const activities = await communityService.activities();
const updatedUser = await updateProfileService({ username, bio, profileImage });
```

For profile images, keep the current data URL flow and send `profileImage` to `PATCH /api/users/me`.

- [ ] **Step 7: Search for remaining Supabase imports**

Run:

```bash
rg "supabase|@/integrations/supabase|@supabase" src api package.json
```

Expected: no runtime Supabase imports. Supabase migration files can remain unused until cleanup.

- [ ] **Step 8: Type-check community migration**

Run:

```bash
npm run type-check
```

Expected: PASS or only errors from obsolete Supabase files scheduled for removal.

- [ ] **Step 9: Commit**

```bash
git add src
git commit -m "feat: migrate community features to API"
```

---

### Task 10: Supabase Cleanup and Documentation

**Files:**
- Modify: `package.json`
- Modify: `README.md`
- Delete: `src/integrations/supabase/client.ts`
- Delete: `src/integrations/supabase/types.ts`
- Delete: `supabase/config.toml`
- Delete: `supabase/migrations/*.sql`

- [ ] **Step 1: Remove Supabase dependency**

Remove from `package.json`:

```json
"@supabase/supabase-js": "^2.49.1"
```

Run:

```bash
npm install
```

Expected: lockfile removes Supabase package tree.

- [ ] **Step 2: Delete unused Supabase files**

Run:

```bash
git rm src/integrations/supabase/client.ts src/integrations/supabase/types.ts supabase/config.toml supabase/migrations/20240325_leaderboard_function.sql supabase/migrations/20241201_fix_security_warnings.sql supabase/migrations/20241202_fix_rls_performance_warnings.sql supabase/migrations/20241203_fix_duplicate_policies.sql supabase/migrations/20241204_restrict_leaderboard_access.sql supabase/migrations/20241205_add_input_validation.sql supabase/migrations/20241206_add_rate_limiting.sql supabase/migrations/20241207_add_captcha_protection.sql
```

- [ ] **Step 3: Update README setup**

Replace Supabase environment section in `README.md` with:

````md
### Environment Variables

Create `.env.local` for local development and set the same values in Vercel:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/voucherswap
JWT_SECRET=replace-with-a-long-random-string
NODE_ENV=development
```

Use MongoDB Atlas M0 free tier for hosted data. In Atlas, add the Vercel deployment IP access option or allow access from all IPs for a student/demo deployment.
````

Update tech stack:

```md
- **Frontend**: React, TypeScript, Vite
- **UI**: Tailwind CSS, shadcn-ui
- **Backend**: Vercel Serverless Functions, Express
- **Database**: MongoDB Atlas
- **Auth**: Email/password with JWT httpOnly cookies
```

- [ ] **Step 4: Verify no Supabase references remain**

Run:

```bash
rg "Supabase|supabase|VITE_SUPABASE|@supabase" README.md src api package.json
```

Expected: no matches.

- [ ] **Step 5: Commit**

```bash
git add README.md package.json package-lock.json src supabase
git commit -m "chore: remove Supabase integration"
```

---

### Task 11: End-to-End Verification

**Files:**
- Modify if failures require fixes: files touched by failing checks.

- [ ] **Step 1: Run backend tests**

Run:

```bash
JWT_SECRET=test-secret npm test
```

Expected: PASS for all Vitest tests.

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Run type-check**

Run:

```bash
npm run type-check
```

Expected: PASS.

- [ ] **Step 4: Run production build**

Run:

```bash
npm run build
```

Expected: PASS and `dist/` generated.

- [ ] **Step 5: Start local dev server**

Run:

```bash
npm run dev
```

Expected: Vite prints a local URL. Keep server running for browser smoke checks.

- [ ] **Step 6: Manual smoke checks**

In browser:

```text
1. Open local Vite URL.
2. Sign up with a test email/password.
3. Log out.
4. Log in with same credentials.
5. Donate one voucher with an image data URL.
6. Browse vouchers and confirm voucher appears.
7. Favorite and unfavorite the voucher.
8. Add a comment.
9. Redeem the voucher.
10. Report a different voucher if available.
11. Create a voucher request.
12. Open settings and update notification preferences.
13. Open leaderboard and community activity sections.
```

Expected: each action completes, page does not crash, and refresh keeps login if `remember me` was checked.

- [ ] **Step 7: Commit verification fixes**

If verification required fixes:

```bash
git add api src package.json package-lock.json README.md vercel.json
git commit -m "fix: complete MERN rewrite verification"
```

If no fixes were required, skip this commit.


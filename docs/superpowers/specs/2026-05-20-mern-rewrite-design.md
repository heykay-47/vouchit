# MERN Rewrite Design

Date: 2026-05-20
Project: VoucherSwap

## Goal

Rewrite the current Supabase-backed VoucherSwap app to a MERN-style stack while preserving the current feature set and keeping all services free for a student-hosted Vercel deployment.

## Current State

The project is a React 18 + Vite + TypeScript app with Tailwind CSS and shadcn-style UI components. It currently uses Supabase for authentication, Postgres data, storage, realtime subscriptions, and RPC functions.

Current data and behavior include email/password and Google auth, profiles, vouchers, favorites, redeemed vouchers, reports, comments, voucher requests, notifications, activities, leaderboard data, image upload support, and frontend React Query caching.

## Selected Approach

Use the existing Vite React frontend and replace Supabase with a Vercel-hosted Node API backed by MongoDB Atlas free tier.

This is the best fit because it preserves most UI code, avoids a full framework migration, keeps hosting simple on Vercel, and uses free infrastructure:

- Frontend: existing React + Vite app.
- Backend: Vercel serverless API routes under `api/`.
- Database: MongoDB Atlas M0 free cluster.
- Auth: email/password only with JWT auth.
- Images: store existing data URLs or compact uploaded image data in MongoDB for the first pass.

## Alternatives Considered

### Full Next.js MERN Rewrite

Move the entire app to Next.js and implement backend routes with Next API handlers or route handlers. This is a strong Vercel-native architecture, but it increases rewrite risk because routing, build config, app structure, and frontend assumptions all change at once.

### Separate Express Backend

Deploy React on Vercel and Express on a separate free backend provider. This creates a traditional MERN split, but free backend platforms often sleep, have tighter limits, or require more deployment setup. It adds operational friction without improving the student/free goal.

## Architecture

The application will remain a single repository:

- `src/`: React frontend, UI, contexts, hooks, pages, and shared utilities.
- `api/`: Node serverless API entry points and backend modules.
- `api/models/`: Mongoose schemas.
- `api/routes/`: route handlers grouped by domain.
- `api/middleware/`: auth, validation, and error handling.
- `api/lib/`: Mongo connection, JWT helpers, response helpers.

Supabase runtime dependencies and integration files will be removed or replaced after callers are migrated.

React Query will continue to cache frontend data. Realtime behavior will not be recreated in the first pass; mutations will invalidate/refetch relevant queries. This keeps the site correct after user actions while avoiding a websocket service.

## Data Model

MongoDB collections:

- `users`: email, passwordHash, username, bio, profileImage, notificationPreferences, createdAt.
- `vouchers`: platform, title, description, code, imageUrl, expiryDate, value, donatedBy, donatedAt, isRedeemed, redeemedBy, redeemedAt, reportCount, isActive, category.
- `favorites`: userId, voucherId, createdAt, with a unique user/voucher pair.
- `redeemedVouchers`: userId, voucherId, redeemedAt.
- `reportedVouchers`: userId, voucherId, reportedAt, with a unique user/voucher pair.
- `comments`: voucherId, userId, text, createdAt.
- `voucherRequests`: userId, title, description, category, responses, isActive, createdAt.
- `notifications`: userId, title, message, type, voucherId, isRead, createdAt.
- `activities`: userId, activityType, entityId, entityType, title, description, createdAt.

Server-side operations will enforce important state changes. Redeeming a voucher must be atomic so two users cannot redeem the same active voucher. Reporting must prevent duplicate reports from the same user and deactivate a voucher when the report count reaches the existing threshold of 5.

## API Design

Authentication:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Users:

- `PATCH /api/users/me`
- `PATCH /api/users/me/preferences`
- `POST /api/users/me/favorites/:voucherId`
- `DELETE /api/users/me/favorites/:voucherId`

Vouchers:

- `GET /api/vouchers`
- `POST /api/vouchers`
- `POST /api/vouchers/:id/redeem`
- `POST /api/vouchers/:id/report`
- `GET /api/vouchers/:id/comments`
- `POST /api/vouchers/:id/comments`

Community features:

- `GET /api/requests`
- `POST /api/requests`
- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `GET /api/leaderboard`
- `GET /api/activities`

API responses will use consistent JSON envelopes:

```json
{ "data": {}, "error": null }
```

For failures:

```json
{ "data": null, "error": { "message": "Human-readable error" } }
```

## Authentication Design

Authentication will support email/password only.

Signup validates email, username, and password. Passwords are hashed with `bcryptjs`. Login verifies the hash and issues a JWT. The JWT is stored in an `httpOnly` cookie for browser safety.

The existing `rememberMe` behavior will be preserved:

- `rememberMe: false`: session cookie.
- `rememberMe: true`: long-lived cookie.

Protected routes will use auth middleware that reads the cookie, verifies the JWT with `JWT_SECRET`, and attaches the current user id to the request context.

Google OAuth and the OAuth callback route will be removed from active UI for now.

## Frontend Migration

The frontend will keep existing pages and component structure where possible.

Main replacements:

- Replace `src/integrations/supabase/client.ts` usages with a new `src/services/api-client.ts`.
- Replace Supabase auth calls in `src/services/auth.service.ts` with `/api/auth/*` calls.
- Keep `AuthContext` and `VoucherContext` public APIs stable where possible.
- Convert direct Supabase calls in comments, requests, notifications, favorites, leaderboard, profile, and settings into service wrapper calls.
- Remove or hide `GoogleSignInButton` and `/auth/callback` behavior.

The app's TypeScript domain types in `src/lib/types.ts` should stay close to the current shape so UI components need minimal changes.

## Error Handling

Backend route handlers will return stable HTTP status codes and JSON error objects. Validation errors return `400`, unauthenticated requests return `401`, forbidden actions return `403`, missing resources return `404`, and unexpected failures return `500`.

Frontend service wrappers will normalize API errors into messages compatible with the existing toast and context error handling patterns.

## Environment Variables

Required local and Vercel environment variables:

- `MONGODB_URI`
- `JWT_SECRET`
- `NODE_ENV`

Frontend Supabase environment variables will no longer be required after migration.

## Deployment

Vercel will build the Vite frontend and host serverless API routes from `api/`. MongoDB Atlas M0 free tier will provide the database.

README updates will include:

- MongoDB Atlas free cluster setup.
- Vercel environment variable setup.
- Local `.env` example.
- Local dev command.
- Build and verification commands.

## Verification

Automated checks:

- `npm run lint`
- `npm run type-check`
- `npm run build`

Manual smoke checks:

- Signup.
- Login.
- Logout.
- Donate voucher.
- Browse vouchers.
- Favorite/unfavorite voucher.
- Redeem voucher.
- Report voucher.
- Add and view comment.
- Create and view voucher request.
- View/update notification settings.
- View leaderboard.

## Scope Boundaries

This rewrite preserves the current feature set but starts with fresh MongoDB data. No Supabase data migration is required.

The first pass will not implement realtime subscriptions, Google login, paid storage services, or a separate backend host. Those can be added later if needed.

# VouchIt

A voucher swapping platform where users can donate and redeem digital vouchers from Google Pay, PayTM, PhonePe, and other online platforms.

## Quick Start

```sh
# Clone and setup
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
npm install

# Set up environment
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

# Start dev server
npm run dev
```

The API runs as Vercel serverless functions — in local dev it only works when deployed or tested via `npx tsx api/app.ts`. Frontend starts at `http://localhost:5173`.

### Environment Variables

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/vouchit
JWT_SECRET=replace-with-a-long-random-string
NODE_ENV=development
```

Use MongoDB Atlas M0 free tier for hosted data. In Atlas, allow Vercel's IPs to connect.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, React Query, React Router v6
- **UI**: Tailwind CSS, shadcn-ui, Radix UI, Framer Motion, Recharts
- **Backend**: Vercel Serverless Functions with Express 4, Mongoose 8, Zod
- **Database**: MongoDB Atlas
- **Auth**: Email/password with bcryptjs + JWT httpOnly cookies
- **Testing**: Vitest, Supertest

## API Endpoints

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/signup` | No | Create account (email, username, password) |
| POST | `/api/auth/login` | No | Log in |
| POST | `/api/auth/logout` | No | Clear session cookie |
| GET | `/api/auth/me` | Yes | Get current user with favorites & redemptions |

### Vouchers
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/vouchers` | No | List active vouchers |
| POST | `/api/vouchers` | Yes | Donate a new voucher |
| POST | `/api/vouchers/:id/redeem` | Yes | Redeem a voucher |
| POST | `/api/vouchers/:id/report` | Yes | Report broken voucher |
| GET | `/api/vouchers/:id/comments` | No | Get comments for a voucher |
| POST | `/api/vouchers/:id/comments` | Yes | Add a comment |

### Users
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| PATCH | `/api/users/me` | Yes | Update profile |
| PATCH | `/api/users/me/preferences` | Yes | Update notification prefs |
| POST | `/api/users/me/favorites/:voucherId` | Yes | Favorite a voucher |
| DELETE | `/api/users/me/favorites/:voucherId` | Yes | Unfavorite |

### Community
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/requests` | No | List voucher requests |
| POST | `/api/requests` | Yes | Create a request |
| GET | `/api/notifications` | Yes | List notifications |
| PATCH | `/api/notifications/:id/read` | Yes | Mark notification read |
| GET | `/api/leaderboard` | No | Top donors |
| GET | `/api/activities` | No | Recent activity feed |

### Health
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Health check |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm test` | Run tests (Vitest) |
| `npm run test:watch` | Watch mode |
| `npm run type-check` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run lint:fix` | ESLint with auto-fix |
| `npm run clean` | Remove dist + cache |

## Deployment

### Vercel

For the full free recruiter demo checklist, see [`DEMO_DEPLOYMENT.md`](DEMO_DEPLOYMENT.md).

Set these environment variables in the Vercel dashboard:

```env
MONGODB_URI=
JWT_SECRET=
NODE_ENV=production
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=
```

Deploy via Git. Frontend is served statically, API routes under `/api/*`.

### Cloudinary (free image uploads)

Voucher screenshots and profile images are uploaded to Cloudinary directly from the browser (no server processing, no DB bloat).

1. Create a free Cloudinary account (no card required, 25 credits/month free).
2. Go to Settings → Upload → Add an **unsigned** upload preset.
3. Copy your **Cloud Name** (dashboard top-left) and the **preset name**.
4. Add `VITE_CLOUDINARY_CLOUD_NAME` and `VITE_CLOUDINARY_UPLOAD_PRESET` to `.env` and to Vercel environment variables.

### Docker

```sh
docker build -t vouchit .
docker run -p 8080:8080 vouchit
```

Visit `http://localhost:8080`.

## Logging

Structured logging via `@/utils/logger`.

**Dev:** all levels visible with pretty-printing.  
**Production:** only `WARN` and `ERROR` as JSON. Sensitive data redacted.

```typescript
import { logger } from '@/utils/logger';
logger.info('User initiated action', { action: 'donate' });
```

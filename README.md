# VouchIt

A voucher sharing platform where customers discover and claim available community vouchers or offers from eligible active business campaigns with remaining claimable inventory before expiry.

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

The frontend starts at `http://localhost:5173`. Vercel runs the API as serverless functions; for local API work, use `npx tsx server/app.ts` alongside the frontend.

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
- **Business inventory**: Papa Parse CSV parsing and preview validation in the browser
- **Testing**: Vitest, Supertest

## Product Model

VouchIt supports both sides of the marketplace without claiming that a payment processor or fulfillment network is built in:

- **Customers** use server-side search, platform/category/source filters, and an expiring-soon filter over available offers ordered by expiry. Community vouchers stay individual; each eligible active business campaign with remaining claimable inventory appears once, and a customer can claim at most one code from that campaign.
- **Businesses** create a campaign draft, validate and confirm CSV inventory, receive a paise-denominated invoice, and record external or offline settlement evidence. Settlement is recorded by VouchIt; it is not processed by VouchIt.
- **Publishing** is settlement-gated. Paid campaign inventory becomes one coherent discoverable offer with a remaining-code count, while the business workspace shows observed voucher views and claims when analytics exist.
- **Pricing** is `₹99 + ₹2 per confirmed campaign voucher`, represented internally as `9900 + 200 * quantity` paise.

## API Endpoints

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/signup` | No | Create a customer or business account (role plus role-specific profile fields) |
| POST | `/api/auth/login` | No | Log in |
| POST | `/api/auth/logout` | No | Clear session cookie |
| GET | `/api/auth/me` | Yes | Get current user with favorites & redemptions |

### Offers
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/offers` | No | Search and filter available community vouchers and eligible active campaigns with remaining claimable inventory in expiry-first order |
| POST | `/api/offers/campaign/:campaignId/claim` | Customer | Claim one remaining campaign code, limited to one code per customer per campaign |
| POST | `/api/offers/campaign/:campaignId/view` | No | Record a best-effort view against eligible grouped campaign inventory |

### Vouchers And Community Actions
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/vouchers` | Optional | List voucher records and signed-in customer history; use `/api/offers` for grouped discovery |
| POST | `/api/vouchers` | Customer | Donate a new community voucher |
| POST | `/api/vouchers/:id/redeem` | Customer | Redeem a community voucher |
| POST | `/api/vouchers/:id/report` | Customer | Report a broken voucher |
| GET | `/api/vouchers/:id/comments` | No | Get comments for a voucher |
| POST | `/api/vouchers/:id/comments` | Customer | Add a comment |

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

### Business
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/business/campaigns` | Business | List owned campaigns with inventory, invoice, and eligible analytics |
| POST | `/api/business/campaigns` | Business | Create a campaign draft |
| GET | `/api/business/campaigns/:id` | Business | Read one owned campaign workspace |
| PATCH | `/api/business/campaigns/:id` | Business | Edit an unlocked campaign draft |
| POST | `/api/business/campaigns/:id/inventory/preview` | Business | Validate CSV-derived inventory rows without writing |
| PUT | `/api/business/campaigns/:id/inventory` | Business | Replace inventory after preview confirmation |
| POST | `/api/business/campaigns/:id/invoice` | Business | Issue the immutable campaign invoice and lock the draft |
| GET | `/api/business/invoices` | Business | List owned invoices |
| POST | `/api/business/invoices/:id/settlement` | Business | Record matching external/offline settlement evidence and activate the campaign |

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

The Docker image serves the static frontend through nginx. It does not serve the Express API; use Vercel for the end-to-end frontend and API deployment.

## Logging

Structured logging via `@/utils/logger`.

**Dev:** all levels visible with pretty-printing.  
**Production:** only `WARN` and `ERROR` as JSON. Sensitive data redacted.

```typescript
import { logger } from '@/utils/logger';
logger.info('User initiated action', { action: 'donate' });
```

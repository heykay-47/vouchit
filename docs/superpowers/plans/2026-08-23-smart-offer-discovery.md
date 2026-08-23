# Smart Offer Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the incomplete client-filtered voucher list with a complete, server-driven offer catalog that groups campaign inventory, supports useful search and filters, and assigns at most one campaign code to each customer.

**Architecture:** Add a dedicated `/api/offers` boundary that aggregates community vouchers and grouped campaigns into a private-code-safe union, then applies viewer-aware filtering and stable cursor pagination. Keep `/api/vouchers` for voucher operations and personal history, enforce campaign claims with one MongoDB transaction plus a partial unique redemption index, and drive `/browse` through TanStack Query with URL-backed filters and a controlled campaign dialog that survives catalog refresh.

**Tech Stack:** React 18, TypeScript 5.5, Vite 5, React Router 6, TanStack Query 5, Express 4, Mongoose 8, MongoDB Atlas transactions, Zod 3, Tailwind CSS 3, Radix UI, Vitest 2, React Testing Library, Supertest.

## Global Constraints

- Treat `docs/superpowers/specs/2026-08-23-smart-offer-discovery-design.md` as authoritative.
- `/api/offers` is available-only discovery; `/api/vouchers` remains the voucher/history boundary.
- A community voucher is one offer. A campaign is one offer regardless of inventory size.
- Search only public title, description, platform, category, campaign brand, and organization fields. Never search voucher codes.
- Search text is trimmed, escaped, and limited to 100 characters.
- Filters are exactly platform, category, source (`all | community | campaign`), and expiry within seven days of server time.
- Browse results sort by expiry ascending, then kind and ID; community offers without expiry sort last.
- The UI requests 24 offers per page. The API accepts `limit` from 1 through 48.
- Pagination uses an opaque versioned cursor containing the expiry/kind/ID tuple. Do not introduce offset pagination.
- Public offer serializers must not expose unclaimed codes, campaign inventory IDs, claimants, or business-owner user IDs.
- A customer may claim at most one code from each campaign, including under concurrent requests and for campaigns with historical claims.
- Only customer accounts may mutate voucher or campaign claim state. Business accounts may inspect public offers.
- Campaign claim writes, redemption history, and final campaign completion happen in one Mongoose transaction.
- Direct `/api/vouchers/:id/redeem` requests accept only community and legacy community vouchers.
- Campaign offer views remain best-effort and continue contributing to the existing aggregate voucher `viewCount` metric.
- Preserve customer access to a successful assigned code in the open dialog and through voucher history.
- Preserve Community Noticeboard styling, lowercase interface copy, responsive controls, keyboard operation, focus handoff, and accessible labels.
- Reuse current dependencies. Do not add Atlas Search, a listing projection, fuzzy search, or a new global context.
- Do not modify or stage unrelated `.gitignore`, `.agent/`, `.impeccable/`, `.openchamber/`, `DESIGN.md`, or other workspace artifacts.
- Use the existing local npm dependencies because the repository Docker image serves only the static frontend and Docker is unavailable in the recorded WSL environment. Never install host system packages.
- Every task uses RED -> GREEN TDD and ends with focused verification and a narrow commit.
- The final feature gate is focused tests, full tests, real type-check, lint, and production build. Per-feature browser verification is not required.

---

## File Structure

### Server Catalog And Claims

- Create `server/lib/offer-cursor.ts`: versioned cursor encode/decode and validation.
- Create `server/lib/offer-cursor.test.ts`: cursor round-trip and rejection coverage.
- Create `server/lib/offer-query.ts`: query parsing, literal search escaping, aggregation pipeline, stable continuation predicate.
- Create `server/lib/offer-query.test.ts`: validation, search, grouping, filters, viewer exclusion, ordering, and cursor pipeline contracts.
- Create `server/lib/offer-serializer.ts`: strict public allowlist for community and campaign offers.
- Create `server/lib/offer-serializer.test.ts`: code, inventory-ID, claimant, and owner privacy tests.
- Create `server/routes/offers.ts`: list, campaign claim, and campaign view routes.
- Create `server/routes/offers.test.ts`: Supertest contracts and transaction rollback/concurrency simulation.
- Modify `server/app.ts`, `server/app.test.ts`: mount offers and rate-limit only offer writes.
- Modify `server/models/RedeemedVoucher.ts`, `server/models/model.test.ts`: optional campaign claim identity and partial unique index.
- Modify `server/models/Voucher.ts`, `server/models/Campaign.ts`: catalog and claim query indexes.
- Modify `server/routes/vouchers.ts`, `server/routes/vouchers.test.ts`: community-only direct redemption and recent personal-history ordering.
- Modify `scripts/seed-demo.mjs`, `scripts/seed-demo.test.ts`: runtime-equivalent redemption/index schema and campaign claim fixture data.

### Frontend Discovery

- Modify `src/lib/types.ts`: offer union, filters, page, and campaign claim contracts.
- Create `src/lib/offer-filters.ts`, `src/lib/offer-filters.test.ts`: canonical URL parse/write behavior.
- Create `src/services/offer.service.ts`, `src/services/offer.service.test.ts`: list/claim/view requests and date hydration.
- Create `src/hooks/useOffersQuery.ts`, `src/hooks/useOffersQuery.test.ts`: viewer-aware infinite query, flattening, and campaign claim mutation.
- Create `src/components/OfferFilters.tsx`, `src/components/OfferFilters.test.tsx`: debounced search and immediate accessible controls.
- Create `src/components/CampaignOfferCard.tsx`, `src/components/CampaignOfferCard.test.tsx`: grouped trigger plus controlled persistent dialog.
- Modify `src/components/AuthHandoff.test.tsx`: real campaign-dialog to auth-modal focus handoff.
- Rewrite `src/pages/Browse.tsx`, `src/pages/Browse.test.tsx`: server-driven composition and all page states.
- Modify `src/services/voucher.service.ts`, `src/components/VoucherCard.tsx`, and their tests: remove obsolete inventory-ID view tracking.
- Modify `src/hooks/useVoucherOperations.ts`: invalidate offers after community availability changes.
- Create `src/hooks/useVoucherOperations.test.ts`: donation/redeem/report invalidation contracts.
- Modify `src/hooks/useBusinessQueries.ts`, `src/hooks/useBusinessQueries.test.ts`: invalidate offers after settlement activation.
- Modify `src/contexts/AuthContext.tsx`.
- Create `src/contexts/AuthContext.test.tsx`: clear viewer-dependent offer and private voucher caches on identity changes.

### Product And Verification

- Modify `README.md`, `PRODUCT.md`, `CHANGELOG.md`, `DEMO_DEPLOYMENT.md`: grouped catalog, filters, campaign claim limit, and API truth.
- Run the focused and full automated gates without changing unrelated workspace files.

---

## Task 1: Campaign Redemption Identity And Seed Parity

**Files:**
- Modify: `server/models/RedeemedVoucher.ts`
- Modify: `server/models/model.test.ts`
- Modify: `scripts/seed-demo.mjs`
- Modify: `scripts/seed-demo.test.ts`

**Interfaces:**
- Consumes: existing `RedeemedVoucher` `{ userId, voucherId, redeemedAt }` records and campaign fixture `campaignKey`.
- Produces: optional `campaignId` and unique partial index `{ userId: 1, campaignId: 1 }` for all new campaign claims; seed schema/data with identical behavior.

- [ ] **Step 1: Record the execution baseline**

Run:

```bash
git status --short --branch
git log -1 --oneline
npm test
npm run type-check
npm run lint
npm run build:production
```

Expected: HEAD includes `e65467a`; capture the existing lint-warning count and any environment-only failure. Do not stage unrelated files.

- [ ] **Step 2: Write failing runtime model tests**

Import `RedeemedVoucher` in `server/models/model.test.ts` and add:

```ts
it('keeps campaign identity optional on redemption history', () => {
  const community = new RedeemedVoucher({
    userId: '507f1f77bcf86cd799439011',
    voucherId: '507f1f77bcf86cd799439012',
  });
  const campaign = new RedeemedVoucher({
    userId: '507f1f77bcf86cd799439011',
    voucherId: '507f1f77bcf86cd799439013',
    campaignId: '507f1f77bcf86cd799439014',
  });

  expect(community.validateSync()).toBeUndefined();
  expect(campaign.validateSync()).toBeUndefined();
});

it('allows only one redemption per customer and campaign', () => {
  expect(RedeemedVoucher.schema.indexes()).toEqual(expect.arrayContaining([
    [
      { userId: 1, campaignId: 1 },
      expect.objectContaining({
        unique: true,
        partialFilterExpression: { campaignId: { $type: 'objectId' } },
      }),
    ],
  ]));
});
```

- [ ] **Step 3: Write failing seed parity tests**

Extend `scripts/seed-demo.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

it('maps redeemed campaign fixtures to one customer-campaign claim', () => {
  const fixtures = buildDemoFixtures(fixedNow);
  const redeemedCampaigns = fixtures.vouchers.filter((voucher) => (
    voucher.campaignKey && voucher.isRedeemed && voucher.redeemedByKey
  ));

  expect(redeemedCampaigns.length).toBeGreaterThan(0);
  expect(new Set(redeemedCampaigns.map((voucher) => (
    `${voucher.redeemedByKey}:${voucher.campaignKey}`
  ))).size).toBe(redeemedCampaigns.length);
});

it('keeps the duplicate seed redemption schema campaign-aware', () => {
  const source = readFileSync(resolve(process.cwd(), 'scripts/seed-demo.mjs'), 'utf8');

  expect(source).toContain("campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', default: null }");
  expect(source).toContain("partialFilterExpression: { campaignId: { $type: 'objectId' } }");
});
```

- [ ] **Step 4: Run focused tests and verify RED**

Run: `npm test -- server/models/model.test.ts scripts/seed-demo.test.ts`

Expected: FAIL because `campaignId` and its unique partial index do not exist.

- [ ] **Step 5: Implement runtime and duplicate seed schemas**

Add to both redemption schemas:

```ts
campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', default: null },
```

Use `mongoose.Schema.Types.ObjectId` in `scripts/seed-demo.mjs`, then add to both schemas:

```ts
redeemedVoucherSchema.index(
  { userId: 1, campaignId: 1 },
  {
    unique: true,
    partialFilterExpression: { campaignId: { $type: 'objectId' } },
  },
);
```

When upserting redeemed fixtures, include campaign identity only for campaign vouchers:

```js
const redemptionCampaignId = fixture.campaignKey
  ? campaigns[fixture.campaignKey]._id
  : null;

await upsertFixture(
  RedeemedVoucher,
  { userId: voucher.redeemedBy, voucherId: voucher._id },
  {
    userId: voucher.redeemedBy,
    voucherId: voucher._id,
    campaignId: redemptionCampaignId,
    redeemedAt: fixture.redeemedAt,
  },
);
```

- [ ] **Step 6: Run focused tests and verify GREEN**

Run: `npm test -- server/models/model.test.ts scripts/seed-demo.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit the invariant**

```bash
git add server/models/RedeemedVoucher.ts server/models/model.test.ts scripts/seed-demo.mjs scripts/seed-demo.test.ts
git commit -m "feat: enforce one campaign claim per customer"
```

---

## Task 2: Offer Cursor, Query, And Public Serializer

**Files:**
- Create: `server/lib/offer-cursor.ts`
- Create: `server/lib/offer-cursor.test.ts`
- Create: `server/lib/offer-query.ts`
- Create: `server/lib/offer-query.test.ts`
- Create: `server/lib/offer-serializer.ts`
- Create: `server/lib/offer-serializer.test.ts`

**Interfaces:**
- Consumes: canonical platform/category strings, MongoDB ObjectId strings, and normalized aggregate rows.
- Produces: `OfferAggregateRow`, `parseOfferQuery(query)`, `escapeSearchPattern(value)`, `buildOfferPipeline(input)`, exact `buildPublicMatch`, `buildSearchMatch`, `buildCursorMatch`, and `buildViewerClaimStages` stage builders, cursor encode/decode, and `toPublicOffer(row, viewerId?)`.

- [ ] **Step 1: Write failing cursor tests**

Create `server/lib/offer-cursor.test.ts`:

```ts
it('round-trips the stable offer tuple', () => {
  const cursor = encodeOfferCursor({
    missingExpiry: 0,
    expiryDate: new Date('2026-09-01T00:00:00.000Z'),
    kind: 'campaign',
    id: '507f1f77bcf86cd799439011',
  });

  expect(decodeOfferCursor(cursor)).toEqual({
    version: 1,
    missingExpiry: 0,
    expiryDate: new Date('2026-09-01T00:00:00.000Z'),
    kind: 'campaign',
    id: '507f1f77bcf86cd799439011',
  });
});

it.each(['not-base64', Buffer.from('{}').toString('base64url')])(
  'rejects invalid cursor %s',
  (cursor) => expect(() => decodeOfferCursor(cursor)).toThrow('Invalid offer cursor'),
);
```

- [ ] **Step 2: Write failing query and privacy tests**

Create `server/lib/offer-query.test.ts` and `server/lib/offer-serializer.test.ts` with these contracts:

```ts
it('parses bounded canonical offer filters', () => {
  expect(parseOfferQuery({
    q: '  fresh.*  ',
    platform: 'Google Pay',
    category: 'Shopping',
    source: 'campaign',
    expiringSoon: 'true',
    limit: '24',
  })).toMatchObject({
    q: 'fresh.*',
    platform: 'Google Pay',
    category: 'Shopping',
    source: 'campaign',
    expiringSoon: true,
    limit: 24,
  });
  expect(escapeSearchPattern('fresh.*[deal]')).toBe('fresh\\.\\*\\[deal\\]');
});

it('serializes a campaign without inventory secrets', () => {
  const response = toPublicOffer({
    _id: '507f1f77bcf86cd799439011',
    kind: 'campaign',
    title: 'Weekend reward',
    description: 'Use this weekend',
    terms: 'One use per customer',
    platform: 'Google Pay',
    category: 'Shopping',
    imageUrl: 'https://example.com/campaign.png',
    expiryDate: new Date('2026-09-01T00:00:00.000Z'),
    value: 'INR 200',
    brandName: 'Fresh',
    organizationName: 'Fresh Ltd',
    remainingCount: 3,
    code: 'DO-NOT-LEAK',
    voucherId: '507f1f77bcf86cd799439099',
    businessId: '507f1f77bcf86cd799439098',
    missingExpiry: 0,
  });

  expect(response).toEqual(expect.objectContaining({
    kind: 'campaign',
    id: '507f1f77bcf86cd799439011',
    remainingCount: 3,
    value: 'INR 200',
  }));
  expect(response).not.toHaveProperty('code');
  expect(response).not.toHaveProperty('voucherId');
  expect(response).not.toHaveProperty('businessId');
});

it('keeps nullable common fields explicit on a community offer', () => {
  const response = toPublicOffer({
    _id: '507f1f77bcf86cd799439012',
    kind: 'community',
    title: 'No-expiry reward',
    description: 'Shared reward',
    platform: 'Paytm',
    imageUrl: 'https://example.com/community.png',
    expiryDate: null,
    donatedAt: new Date('2026-08-23T00:00:00.000Z'),
    missingExpiry: 1,
  });

  expect(response).toHaveProperty('expiryDate', null);
  expect(response).toHaveProperty('category', null);
});
```

- [ ] **Step 3: Run focused tests and verify RED**

Run: `npm test -- server/lib/offer-cursor.test.ts server/lib/offer-query.test.ts server/lib/offer-serializer.test.ts`

Expected: FAIL because all offer helpers are missing.

- [ ] **Step 4: Implement the cursor contract**

Create `server/lib/offer-cursor.ts` with a versioned payload and strict validation:

```ts
export type OfferCursorRow = {
  missingExpiry: 0 | 1;
  expiryDate: Date | null;
  kind: 'community' | 'campaign';
  id: string;
};

export type OfferCursor = OfferCursorRow & { version: 1 };

const cursorSchema = z.object({
  v: z.literal(1),
  m: z.union([z.literal(0), z.literal(1)]),
  e: z.string().datetime().nullable(),
  k: z.enum(['community', 'campaign']),
  i: z.string().refine(mongoose.isValidObjectId),
});

export const encodeOfferCursor = (row: OfferCursorRow) => Buffer.from(JSON.stringify({
  v: 1,
  m: row.missingExpiry,
  e: row.expiryDate?.toISOString() ?? null,
  k: row.kind,
  i: row.id,
})).toString('base64url');

export const decodeOfferCursor = (value: string): OfferCursor => {
  try {
    const parsed = cursorSchema.parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')));
    if ((parsed.m === 0) !== (parsed.e !== null)) throw new Error('inconsistent expiry');
    return {
      version: 1,
      missingExpiry: parsed.m,
      expiryDate: parsed.e ? new Date(parsed.e) : null,
      kind: parsed.k,
      id: parsed.i,
    };
  } catch {
    throw new ApiError(400, 'Invalid offer cursor');
  }
};

export const cursorRowFor = (row: {
  _id: { toString(): string };
  missingExpiry: 0 | 1;
  expiryDate: Date | null;
  kind: 'community' | 'campaign';
}): OfferCursorRow => ({
  id: row._id.toString(),
  missingExpiry: row.missingExpiry,
  expiryDate: row.expiryDate,
  kind: row.kind,
});
```

- [ ] **Step 5: Implement query parsing and literal search**

Create `server/lib/offer-query.ts` with canonical enums and defaults:

```ts
export const OFFER_PLATFORMS = ['Google Pay', 'Paytm', 'PhonePe', 'Other'] as const;
export const OFFER_CATEGORIES = ['Food', 'Shopping', 'Travel', 'Entertainment', 'Electronics', 'Health', 'Other'] as const;

const rawOfferQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  platform: z.enum(OFFER_PLATFORMS).optional(),
  category: z.enum(OFFER_CATEGORIES).optional(),
  source: z.enum(['all', 'community', 'campaign']).default('all'),
  expiringSoon: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  limit: z.coerce.number().int().min(1).max(48).default(24),
  cursor: z.string().max(512).optional(),
}).strict();

export const escapeSearchPattern = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const parseOfferQuery = (query: unknown) => rawOfferQuerySchema.parse(query);
```

Add invalid cases for unknown keys, duplicate scalar query values, overlong search/cursor text, noncanonical booleans, and limits outside `1..48`; every case must throw the same Zod-backed `400` envelope at the route boundary.

Export `buildOfferPipeline(input)` initially with the normalized community projection, campaign `$unionWith`, public profile and eligible-inventory lookups, stable sort keys, and a `$facet` with `metadata` and `page` branches. Tasks 3 and 4 lock its route and filter details.

- [ ] **Step 6: Implement strict public serialization**

Create `server/lib/offer-serializer.ts`. Use explicit object construction, never spread raw rows:

```ts
export type OfferAggregateRow = {
  _id: { toString(): string };
  kind: 'community' | 'campaign';
  title: string;
  description: string;
  platform: string;
  imageUrl: string;
  expiryDate: Date | null;
  category?: string | null;
  value?: string | null;
  donatedBy?: { toString(): string };
  donatedAt?: Date;
  reportCount?: number;
  terms?: string;
  brandName?: string;
  organizationName?: string;
  remainingCount?: number;
  missingExpiry: 0 | 1;
  [key: string]: unknown;
};

export const toPublicOffer = (row: OfferAggregateRow, viewerId?: string) => {
  if (row.kind === 'campaign') {
    return {
      kind: 'campaign' as const,
      id: row._id.toString(),
      title: row.title,
      description: row.description,
      terms: row.terms,
      platform: row.platform,
      category: row.category,
      imageUrl: row.imageUrl,
      expiryDate: row.expiryDate,
      value: row.value ?? undefined,
      brandName: row.brandName,
      organizationName: row.organizationName,
      remainingCount: row.remainingCount,
    };
  }

  return {
    kind: 'community' as const,
    id: row._id.toString(),
    sourceType: 'community' as const,
    platform: row.platform,
    title: row.title,
    description: row.description,
    imageUrl: row.imageUrl,
    expiryDate: row.expiryDate,
    value: row.value ?? undefined,
    donatedBy: row.donatedBy?.toString() === viewerId ? viewerId : 'anonymous',
    donatedAt: row.donatedAt,
    isRedeemed: false,
    reportCount: row.reportCount ?? 0,
    isActive: true,
    category: row.category ?? null,
  };
};
```

- [ ] **Step 7: Run focused tests and verify GREEN**

Run: `npm test -- server/lib/offer-cursor.test.ts server/lib/offer-query.test.ts server/lib/offer-serializer.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit the pure offer boundary**

```bash
git add server/lib/offer-cursor.ts server/lib/offer-cursor.test.ts server/lib/offer-query.ts server/lib/offer-query.test.ts server/lib/offer-serializer.ts server/lib/offer-serializer.test.ts
git commit -m "feat: define public offer catalog contract"
```

---

## Task 3: Grouped Offer Listing Route

**Files:**
- Create: `server/routes/offers.ts`
- Create: `server/routes/offers.test.ts`
- Modify: `server/lib/offer-query.ts`
- Modify: `server/lib/offer-query.test.ts`
- Modify: `server/models/Voucher.ts`
- Modify: `server/models/Campaign.ts`
- Modify: `server/models/model.test.ts`
- Modify: `server/app.ts`
- Modify: `server/app.test.ts`

**Interfaces:**
- Consumes: `parseOfferQuery`, `buildOfferPipeline`, `toPublicOffer`, `encodeOfferCursor`, optional auth, `Voucher.aggregate()`.
- Produces: `GET /api/offers -> { offers, total, nextCursor, hasMore }`, default 24-item pages, grouped campaign inventory, and supporting indexes.

- [ ] **Step 1: Write failing route and mount tests**

Create `server/routes/offers.test.ts` with a captured pipeline and controlled aggregation page:

```ts
const offerState = vi.hoisted(() => ({
  pipeline: [] as Record<string, unknown>[],
  rows: [] as Record<string, unknown>[],
}));

const communityAggregateRow = {
  _id: { toString: () => '507f1f77bcf86cd799439011' },
  kind: 'community',
  title: 'Community reward',
  description: 'Shared by a customer',
  platform: 'Google Pay',
  imageUrl: 'https://example.com/community.png',
  expiryDate: new Date('2026-09-01T00:00:00.000Z'),
  donatedAt: new Date('2026-08-23T00:00:00.000Z'),
  missingExpiry: 0,
};
const campaignAggregateRow = {
  _id: { toString: () => '507f1f77bcf86cd799439012' },
  kind: 'campaign',
  title: 'Business reward',
  description: 'Published inventory',
  terms: 'One per customer',
  platform: 'Google Pay',
  category: 'Shopping',
  imageUrl: 'https://example.com/campaign.png',
  expiryDate: new Date('2026-09-02T00:00:00.000Z'),
  brandName: 'Fresh Rewards',
  organizationName: 'Fresh Market Ltd',
  remainingCount: 3,
  missingExpiry: 0,
  code: 'SECRET-CODE',
  voucherId: 'inventory-voucher-id',
};

vi.mock('../models/Voucher', () => ({
  Voucher: {
    aggregate: vi.fn(async (pipeline: Record<string, unknown>[]) => {
      offerState.pipeline = pipeline;
      return [{
        metadata: [{ total: offerState.rows.length }],
        page: offerState.rows,
      }];
    }),
  },
}));

const lastPipeline = () => offerState.pipeline;
```

Then add:

```ts
it('returns community vouchers and one grouped campaign offer without secrets', async () => {
  offerState.rows.push(
    communityAggregateRow,
    { ...campaignAggregateRow, remainingCount: 3 },
  );

  const response = await request(createApp()).get('/api/offers').expect(200);

  expect(response.body.data).toMatchObject({
    total: 2,
    hasMore: false,
    nextCursor: null,
    offers: [
      expect.objectContaining({ kind: 'community' }),
      expect.objectContaining({ kind: 'campaign', remainingCount: 3 }),
    ],
  });
  expect(JSON.stringify(response.body)).not.toContain('SECRET-CODE');
  expect(JSON.stringify(response.body)).not.toContain('inventory-voucher-id');
});
```

Extend `server/app.test.ts`:

```ts
it('leaves offer reads outside the write limiter and limits offer claims', async () => {
  const read = await request(createApp()).get('/api/offers?limit=0');
  const write = await request(createApp()).post('/api/offers/campaign/not-an-id/claim');

  expect(read.headers['ratelimit-remaining']).toBeUndefined();
  expect(write.headers['ratelimit-remaining']).toBeDefined();
});
```

- [ ] **Step 2: Write failing grouping and index tests**

In `server/lib/offer-query.test.ts`, inspect the generated pipeline:

```ts
it('groups eligible campaign inventory before public pagination', () => {
  const pipeline = buildOfferPipeline({ now, source: 'all', expiringSoon: false, limit: 24 });
  const union = pipeline.find((stage) => '$unionWith' in stage)?.$unionWith;

  expect(pipeline[0]).toEqual({ $match: { $and: [
    { $or: [{ sourceType: 'community' }, { sourceType: { $exists: false } }] },
    {
      isActive: true,
      isRedeemed: false,
      $or: [
        { expiryDate: null },
        { expiryDate: { $exists: false } },
        { expiryDate: { $gt: now } },
      ],
    },
  ] } });
  expect(union).toEqual(expect.objectContaining({ coll: 'campaigns' }));
  expect(union.pipeline).toContainEqual({ $match: {
    status: 'active',
    expiryDate: { $gt: now },
  } });
  expect(union.pipeline).toContainEqual({ $lookup: {
    from: 'vouchers',
    let: { campaignId: '$_id' },
    pipeline: [
      { $match: { $expr: { $and: [
        { $eq: ['$campaignId', '$$campaignId'] },
        { $eq: ['$sourceType', 'campaign'] },
        { $eq: ['$isActive', true] },
        { $eq: ['$isRedeemed', false] },
        { $gt: ['$expiryDate', now] },
      ] } } },
      { $count: 'remainingCount' },
    ],
    as: 'inventory',
  } });
  expect(union.pipeline).toContainEqual({ $match: { remainingCount: { $gt: 0 } } });
  expect(JSON.stringify(union.pipeline)).not.toContain('code');
});
```

Add exact assertions for the business-profile lookup, both allowlist projections, normalized `missingExpiry`, and the final facet shape. The page branch must end in sort `{ missingExpiry: 1, expiryDate: 1, kind: 1, _id: 1 }` and `limit + 1`; metadata must be exactly `[{ $count: 'total' }]`. Do not use token/string-presence assertions for behavior.

Add exact compound-index expectations to `server/models/model.test.ts`:

```ts
expect(Campaign.schema.indexes()).toEqual(expect.arrayContaining([
  [{ status: 1, expiryDate: 1, _id: 1 }, expect.anything()],
]));
expect(Voucher.schema.indexes()).toEqual(expect.arrayContaining([
  [{ sourceType: 1, isActive: 1, isRedeemed: 1, expiryDate: 1, _id: 1 }, expect.anything()],
  [{ campaignId: 1, sourceType: 1, isActive: 1, isRedeemed: 1, expiryDate: 1, _id: 1 }, expect.anything()],
  [{ campaignId: 1, redeemedBy: 1 }, expect.anything()],
]));
```

- [ ] **Step 3: Run focused tests and verify RED**

Run: `npm test -- server/routes/offers.test.ts server/lib/offer-query.test.ts server/models/model.test.ts server/app.test.ts`

Expected: FAIL because the route, mount, grouping stages, and indexes are absent.

- [ ] **Step 4: Implement the normalized aggregation**

Finish `buildOfferPipeline()` with this stage order:

```ts
return [
  { $match: communityAvailabilityMatch(now) },
  { $project: communityOfferProjection() },
  { $unionWith: {
    coll: 'campaigns',
    pipeline: [
      { $match: { status: 'active', expiryDate: { $gt: now } } },
      profileLookupStage(),
      eligibleInventoryLookupStage(now),
      { $set: { remainingCount: { $ifNull: [{ $first: '$inventory.remainingCount' }, 0] } } },
      { $match: { remainingCount: { $gt: 0 } } },
      { $project: campaignOfferProjection() },
    ],
  } },
  { $set: { missingExpiry: { $cond: [{ $eq: ['$expiryDate', null] }, 1, 0] } } },
  { $facet: {
    metadata: [{ $count: 'total' }],
    page: [{ $sort: { missingExpiry: 1, expiryDate: 1, kind: 1, _id: 1 } }, { $limit: input.limit + 1 }],
  } },
];
```

The inventory lookup must match only `sourceType: 'campaign'`, active, unredeemed vouchers whose expiry is after `now`, then `$count` them. Project only public campaign fields and `remainingCount`.

- [ ] **Step 5: Implement the list route and app mount**

Create `server/routes/offers.ts`:

```ts
router.get('/', optionalAuth, asyncRoute(async (req, res) => {
  const parsed = parseOfferQuery(req.query);
  await connectDb();
  const viewerId = getOptionalUserId(req);
  const [result = { metadata: [], page: [] }] = await Voucher.aggregate(
    buildOfferPipeline({ ...parsed, now: new Date(), viewerId }),
  );
  const rows = result.page as OfferAggregateRow[];
  const hasMore = rows.length > parsed.limit;
  const visibleRows = rows.slice(0, parsed.limit);
  const last = visibleRows.at(-1);

  ok(res, {
    offers: visibleRows.map((row) => toPublicOffer(row, viewerId)),
    total: result.metadata[0]?.total ?? 0,
    nextCursor: hasMore && last ? encodeOfferCursor(cursorRowFor(last)) : null,
    hasMore,
  });
}));
```

In `server/app.ts`, mount the write limiter only on offer POST paths, then mount the router:

```ts
app.use('/api/offers/campaign/:campaignId/claim', writeLimiter);
app.use('/api/offers/campaign/:campaignId/view', writeLimiter);
app.use('/api/offers', offersRouter);
```

- [ ] **Step 6: Add supporting indexes**

Add the three voucher indexes and one campaign index asserted in Step 2. Mirror those runtime indexes in `scripts/seed-demo.mjs` during Task 13 so the demo schema cannot drift.

- [ ] **Step 7: Run focused tests and verify GREEN**

Run: `npm test -- server/routes/offers.test.ts server/lib/offer-query.test.ts server/lib/offer-serializer.test.ts server/models/model.test.ts server/app.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit grouped listing**

```bash
git add server/routes/offers.ts server/routes/offers.test.ts server/lib/offer-query.ts server/lib/offer-query.test.ts server/models/Voucher.ts server/models/Campaign.ts server/models/model.test.ts server/app.ts server/app.test.ts
git commit -m "feat: list grouped marketplace offers"
```

---

## Task 4: Search, Filters, Viewer Exclusion, And Cursor Continuation

**Files:**
- Modify: `server/lib/offer-query.ts`
- Modify: `server/lib/offer-query.test.ts`
- Modify: `server/routes/offers.ts`
- Modify: `server/routes/offers.test.ts`

**Interfaces:**
- Consumes: Task 3 normalized offer stream and Task 2 decoded cursor.
- Produces: literal public search, exact core filters, customer-only claimed-campaign exclusion, seven-day expiry filter, stable continuation, and total-before-cursor semantics.

- [ ] **Step 1: Write failing search and filter tests**

Add table-driven tests to `server/lib/offer-query.test.ts` and route contract cases:

```ts
it.each([
  ['platform', { platform: 'Google Pay' }, { platform: 'Google Pay' }],
  ['category', { category: 'Shopping' }, { category: 'Shopping' }],
  ['community source', { source: 'community' }, { kind: 'community' }],
  ['campaign source', { source: 'campaign' }, { kind: 'campaign' }],
  ['seven-day expiry', { expiringSoon: true }, {
    expiryDate: { $gt: now, $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
  }],
])('builds the exact %s predicate', (_name, input, expected) => {
  expect(buildPublicMatch({
    now,
    source: 'all',
    expiringSoon: false,
    ...input,
  })).toEqual(expected);
});

it.each(['.', '.*', '[abc]', 'a+b', 'foo(bar)'])(
  'treats search input %s literally',
  (q) => {
    expect(buildSearchMatch(q)).toEqual({ $or: [
      'title', 'description', 'platform', 'category', 'brandName', 'organizationName',
    ].map((field) => ({
      [field]: { $regex: escapeSearchPattern(q), $options: 'i' },
    })) });
  },
);

it('combines all public filters without replacing a predicate', () => {
  expect(buildPublicMatch({
    now,
    platform: 'Google Pay',
    category: 'Shopping',
    source: 'campaign',
    expiringSoon: true,
  })).toEqual({
    platform: 'Google Pay',
    category: 'Shopping',
    kind: 'campaign',
    expiryDate: { $gt: now, $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
  });
});

it('inserts public and literal-search matches into the normalized pipeline', () => {
  const input = {
    now,
    q: 'fresh.*',
    platform: 'Google Pay' as const,
    category: 'Shopping' as const,
    source: 'campaign' as const,
    expiringSoon: true,
    limit: 24,
  };
  const pipeline = buildOfferPipeline(input);
  const publicMatchStage = { $match: buildPublicMatch(input) };
  const searchMatchStage = { $match: buildSearchMatch(input.q) };
  const unionIndex = pipeline.findIndex((stage) => '$unionWith' in stage);
  const publicMatchIndex = pipeline.findIndex((stage) => (
    JSON.stringify(stage) === JSON.stringify(publicMatchStage)
  ));
  const searchMatchIndex = pipeline.findIndex((stage) => (
    JSON.stringify(stage) === JSON.stringify(searchMatchStage)
  ));
  const facetIndex = pipeline.findIndex((stage) => '$facet' in stage);

  expect(pipeline).toContainEqual(publicMatchStage);
  expect(pipeline).toContainEqual(searchMatchStage);
  expect(unionIndex).toBeLessThan(publicMatchIndex);
  expect(unionIndex).toBeLessThan(searchMatchIndex);
  expect(publicMatchIndex).toBeLessThan(facetIndex);
  expect(searchMatchIndex).toBeLessThan(facetIndex);
});
```

- [ ] **Step 2: Write failing cursor and viewer tests**

Add:

```ts
const decodedCursor = decodeOfferCursor(encodeOfferCursor({
  missingExpiry: 0,
  expiryDate: new Date('2026-09-01T00:00:00.000Z'),
  kind: 'community',
  id: '507f1f77bcf86cd799439011',
}));

it('counts all matches before applying the cursor to the page branch', () => {
  const pipeline = buildOfferPipeline({
    now,
    source: 'all',
    expiringSoon: false,
    limit: 2,
    cursor: decodedCursor,
  });
  const facet = pipeline.find((stage) => '$facet' in stage)?.$facet;

  expect(facet.metadata).toEqual([{ $count: 'total' }]);
  expect(facet.page[0]).toEqual({ $match: buildCursorMatch(decodedCursor) });
});

it('builds an exact lexicographic continuation predicate', () => {
  expect(buildCursorMatch(decodedCursor)).toEqual({ $or: [
    { missingExpiry: { $gt: 0 } },
    { missingExpiry: 0, expiryDate: { $gt: decodedCursor.expiryDate } },
    { missingExpiry: 0, expiryDate: decodedCursor.expiryDate, kind: { $gt: 'community' } },
    {
      missingExpiry: 0,
      expiryDate: decodedCursor.expiryDate,
      kind: 'community',
      _id: { $gt: new mongoose.Types.ObjectId(decodedCursor.id) },
    },
  ] });
});

const customerClaimExclusionStages = [
  { $lookup: {
    from: 'vouchers',
    let: { campaignId: '$_id' },
    pipeline: [
      { $match: { $expr: { $and: [
        { $eq: ['$campaignId', '$$campaignId'] },
        { $eq: ['$sourceType', 'campaign'] },
        { $eq: ['$isRedeemed', true] },
        { $eq: ['$redeemedBy', new mongoose.Types.ObjectId(customerId)] },
      ] } } },
      { $limit: 1 },
    ],
    as: 'viewerClaims',
  } },
  { $set: { viewerClaimed: { $gt: [{ $size: '$viewerClaims' }, 0] } } },
  { $match: { viewerClaimed: false } },
  { $unset: ['viewerClaims', 'viewerClaimed'] },
];

it('adds claim exclusion only for a customer viewer', () => {
  expect(buildViewerClaimStages({ viewerId: customerId, viewerRole: 'customer' }))
    .toEqual(customerClaimExclusionStages);
  expect(buildViewerClaimStages({ viewerId: businessId, viewerRole: 'business' })).toEqual([]);
  expect(buildViewerClaimStages({})).toEqual([]);
});
```

Separately keep a route test asserting the authenticated customer ID/role produces that exact captured pipeline. Do not make a controlled aggregate mock pretend it executed the pipeline.

Also test anonymous and business viewers still receive that active campaign, malformed cursors return `400`, no-expiry community offers sort last, and removal of the previous page's last row does not skip the next tuple.

- [ ] **Step 3: Run focused tests and verify RED**

Run: `npm test -- server/lib/offer-query.test.ts server/routes/offers.test.ts server/lib/offer-cursor.test.ts`

Expected: FAIL because global filters, viewer role lookup, and continuation predicates are incomplete.

- [ ] **Step 4: Implement global public predicates**

After normalization and before `$facet`, append exact filter stages:

```ts
const publicMatch = {
  ...(input.platform ? { platform: input.platform } : {}),
  ...(input.category ? { category: input.category } : {}),
  ...(input.source !== 'all' ? { kind: input.source } : {}),
  ...(input.expiringSoon ? {
    expiryDate: {
      $gt: input.now,
      $lte: new Date(input.now.getTime() + 7 * 24 * 60 * 60 * 1000),
    },
  } : {}),
};

const searchMatch = input.q ? {
  $or: ['title', 'description', 'platform', 'category', 'brandName', 'organizationName']
    .map((field) => ({ [field]: { $regex: escapeSearchPattern(input.q), $options: 'i' } })),
} : null;
```

Map API source `campaign` directly to normalized kind `campaign`; map `community` likewise. Do not match `Voucher.code` in any stage.

- [ ] **Step 5: Implement viewer-aware exclusion and stable cursor matching**

In `server/routes/offers.ts`, resolve the optional viewer role without putting it in the token:

```ts
const viewer = viewerId ? await User.findById(viewerId).select('role').lean() : null;
const viewerRole = viewer ? resolveUserRole(viewer.role) : undefined;
const cursor = parsed.cursor ? decodeOfferCursor(parsed.cursor) : undefined;

const [result = { metadata: [], page: [] }] = await Voucher.aggregate(
  buildOfferPipeline({ ...parsed, cursor, now: new Date(), viewerId, viewerRole }),
);
```

In `server/routes/offers.test.ts`, mock `User.findById()` as a chain with `.select().lean()` and choose the returned role from the requested fixture user ID. Keep `lastPipeline()` backed by the captured aggregate mock created in Task 3.

Only for `viewerRole === 'customer'`, add a campaign lookup that sets `viewerClaimed` when any campaign voucher has `isRedeemed: true` and `redeemedBy: viewerId`, then exclude `viewerClaimed: true` campaign rows.

Build a lexicographic continuation predicate in the page facet:

```ts
const cursorMatch = cursor ? {
  $or: [
    { missingExpiry: { $gt: cursor.missingExpiry } },
    ...(cursor.expiryDate ? [{
      missingExpiry: cursor.missingExpiry,
      expiryDate: { $gt: cursor.expiryDate },
    }] : []),
    {
      missingExpiry: cursor.missingExpiry,
      expiryDate: cursor.expiryDate,
      kind: { $gt: cursor.kind },
    },
    {
      missingExpiry: cursor.missingExpiry,
      expiryDate: cursor.expiryDate,
      kind: cursor.kind,
      _id: { $gt: new mongoose.Types.ObjectId(cursor.id) },
    },
  ],
} : null;
```

- [ ] **Step 6: Run focused tests and verify GREEN**

Run: `npm test -- server/lib/offer-query.test.ts server/routes/offers.test.ts server/lib/offer-cursor.test.ts`

Expected: PASS for every approved search, filter, viewer, count, order, and cursor contract.

- [ ] **Step 7: Commit complete catalog semantics**

```bash
git add server/lib/offer-query.ts server/lib/offer-query.test.ts server/routes/offers.ts server/routes/offers.test.ts
git commit -m "feat: search and filter marketplace offers"
```

---

## Task 5: Block Direct Campaign Inventory Redemption

**Files:**
- Modify: `server/routes/vouchers.ts`
- Modify: `server/routes/vouchers.test.ts`

**Interfaces:**
- Consumes: existing `voucherAvailabilityFilter(now)` and community redemption endpoint.
- Produces: an atomic community-or-legacy source predicate that cannot overwrite the existing expiry `$or`; campaign inventory IDs always return `409` unchanged.

- [ ] **Step 1: Write failing bypass regression tests**

Add to `server/routes/vouchers.test.ts`:

```ts
const customerId = '507f1f77bcf86cd799439022';
const customerToken = signAuthToken({ userId: customerId }, '1h');
let voucherSequence = 40;
const makeVoucher = (overrides: Record<string, unknown> = {}) => ({
  _id: { toString: () => `507f1f77bcf86cd7994390${voucherSequence++}` },
  code: 'COMMUNITY-CODE',
  donatedBy: '507f1f77bcf86cd799439011',
  donatedAt: new Date('2026-08-23T00:00:00.000Z'),
  isActive: true,
  isRedeemed: false,
  reportCount: 0,
  ...overrides,
});

it('rejects direct redemption of campaign inventory', async () => {
  const campaignVoucher = makeVoucher({
    sourceType: 'campaign',
    campaignId: '507f1f77bcf86cd799439013',
    code: 'PRIVATE-CAMPAIGN-CODE',
    isActive: true,
    isRedeemed: false,
    expiryDate: new Date(Date.now() + 60_000),
  });
  vouchers.push(campaignVoucher);

  await request(createApp())
    .post(`/api/vouchers/${campaignVoucher._id}/redeem`)
    .set('Cookie', [`auth_token=${customerToken}`])
    .expect(409);

  expect(campaignVoucher.isRedeemed).toBe(false);
  expect(RedeemedVoucher.create).not.toHaveBeenCalled();
});

it.each(['community', undefined])('still redeems %s vouchers', async (sourceType) => {
  const voucher = makeVoucher({ sourceType, isActive: true, isRedeemed: false, expiryDate: null });
  vouchers.push(voucher);

  await request(createApp())
    .post(`/api/vouchers/${voucher._id}/redeem`)
    .set('Cookie', [`auth_token=${customerToken}`])
    .expect(200);

  expect(voucher.isRedeemed).toBe(true);
});
```

- [ ] **Step 2: Run the focused route tests and verify RED**

Run: `npm test -- server/routes/vouchers.test.ts`

Expected: the campaign bypass test FAILS because the current atomic predicate accepts campaign rows.

- [ ] **Step 3: Compose source and availability predicates safely**

Change only the atomic redemption filter:

```ts
const communitySourceFilter = {
  $or: [
    { sourceType: 'community' },
    { sourceType: { $exists: false } },
  ],
};

const voucher = await Voucher.findOneAndUpdate(
  {
    $and: [
      { _id: voucherId },
      voucherAvailabilityFilter(),
      communitySourceFilter,
      { donatedBy: { $ne: userId } },
    ],
  },
  { isRedeemed: true, redeemedBy: userId, redeemedAt: new Date() },
  { new: true },
);
```

Do not keep campaign-completion logic in this route after campaign rows become unreachable.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm test -- server/routes/vouchers.test.ts server/lib/voucher-serializer.test.ts`

Expected: PASS, including donor-self-claim, stale expiry, and concurrent community claim regressions.

- [ ] **Step 5: Commit the bypass closure**

```bash
git add server/routes/vouchers.ts server/routes/vouchers.test.ts
git commit -m "fix: route campaign claims through offer inventory"
```

---

## Task 6: Transactional Campaign Claims And Recent History

**Files:**
- Modify: `server/routes/offers.ts`
- Modify: `server/routes/offers.test.ts`
- Modify: `server/routes/vouchers.ts`
- Modify: `server/routes/vouchers.test.ts`

**Interfaces:**
- Consumes: `POST /api/offers/campaign/:campaignId/claim`, `withTransaction`, partial unique redemption index, `toVoucherResponse`.
- Produces: `{ voucher, message }` with one private assigned code; `400/401/403/404/409` claim outcomes; rollback-safe final campaign completion; authenticated voucher history ordered by recent redemption.

- [ ] **Step 1: Write failing claim authorization and state tests**

Extend `server/routes/offers.test.ts`:

```ts
const customerId = '507f1f77bcf86cd799439022';
const otherCustomerId = '507f1f77bcf86cd799439023';
const campaignId = '507f1f77bcf86cd799439013';
const unknownCampaignId = '507f1f77bcf86cd799439099';
const voucherId1 = '507f1f77bcf86cd799439031';
const voucherId2 = '507f1f77bcf86cd799439032';
const customerToken = signAuthToken({ userId: customerId }, '1h');
const businessToken = signAuthToken({ userId: '507f1f77bcf86cd799439011' }, '1h');

const makeCampaign = (overrides: Record<string, unknown> = {}) => ({
  _id: campaignId,
  businessProfileId: '507f1f77bcf86cd799439014',
  status: 'active',
  expiryDate: new Date(Date.now() + 60_000),
  ...overrides,
});
const makeCampaignVoucher = (overrides: Record<string, unknown> = {}) => ({
  _id: voucherId1,
  campaignId,
  sourceType: 'campaign',
  code: 'CAMPAIGN-CODE',
  isActive: true,
  isRedeemed: false,
  redeemedBy: null,
  expiryDate: new Date(Date.now() + 60_000),
  viewCount: 0,
  ...overrides,
});
const claim = (id: string, token: string) => request(createApp())
  .post(`/api/offers/campaign/${id}/claim`)
  .set('Cookie', [`auth_token=${token}`]);

it.each([
  ['anonymous', undefined, 401],
  ['business', businessToken, 403],
])('rejects %s campaign claims', async (_name, token, status) => {
  const call = request(createApp()).post(`/api/offers/campaign/${campaignId}/claim`);
  if (token) call.set('Cookie', [`auth_token=${token}`]);
  await call.expect(status);
});

it('returns 404 for an unknown campaign and 409 for unavailable inventory', async () => {
  await claim(unknownCampaignId, customerToken).expect(404);
  campaigns.push(makeCampaign({ _id: campaignId, status: 'completed' }));
  await claim(campaignId, customerToken).expect(409);
});
```

Also cover malformed ID `400`, expired, sold-out, and historical `redeemedBy` claims.

- [ ] **Step 2: Write failing transaction success and rollback tests**

Use a per-session undo log rather than one global array snapshot. A global snapshot can undo the winning request when two Supertest calls overlap, so every mutating model mock must register only its own pre-write state on `session.undo` before changing a voucher or campaign:

```ts
type TestSession = { id: string; undo: Array<() => void> };
let sessionSequence = 0;
let priorClaimBarrier: (() => Promise<null>) | null = null;

vi.mock('../lib/transaction', () => ({
  withTransaction: vi.fn(async (work: (session: TestSession) => Promise<unknown>) => {
    const currentSession: TestSession = { id: `offer-session-${++sessionSequence}`, undo: [] };
    try {
      return await work(currentSession);
    } catch (error) {
      currentSession.undo.reverse().forEach((undo) => undo());
      throw error;
    }
  }),
}));

const updateWithUndo = (document: Record<string, unknown>, changes: Record<string, unknown>, session: TestSession) => {
  const before = { ...document };
  session.undo.push(() => {
    Object.keys(document).forEach((key) => delete document[key]);
    Object.assign(document, before);
  });
  Object.assign(document, changes);
};

it('assigns the first eligible code and writes history in one transaction', async () => {
  campaigns.push(makeCampaign({ _id: campaignId, status: 'active' }));
  vouchers.push(
    makeCampaignVoucher({ _id: voucherId2, campaignId, code: 'SECOND' }),
    makeCampaignVoucher({ _id: voucherId1, campaignId, code: 'FIRST' }),
  );

  const response = await claim(campaignId, customerToken).expect(200);

  expect(response.body.data.voucher).toMatchObject({ code: 'FIRST', redeemedBy: customerId });
  expect(RedeemedVoucher.create).toHaveBeenCalledWith([
    expect.objectContaining({ userId: customerId, voucherId: voucherId1, campaignId }),
  ], { session: expect.objectContaining({ id: expect.stringMatching(/^offer-session-/) }) });
});

it('rolls back inventory when redemption history fails', async () => {
  RedeemedVoucher.create.mockRejectedValueOnce(new Error('history unavailable'));

  await claim(campaignId, customerToken).expect(500);

  expect(vouchers[0]).toMatchObject({ isRedeemed: false, redeemedBy: null });
});

it('commits one same-customer claim and rolls the duplicate back', async () => {
  campaigns.push(makeCampaign());
  vouchers.push(
    makeCampaignVoucher({ _id: voucherId1, code: 'FIRST' }),
    makeCampaignVoucher({ _id: voucherId2, code: 'SECOND' }),
  );
  let releasePriorChecks!: () => void;
  const bothPriorChecksStarted = new Promise<void>((resolve) => { releasePriorChecks = resolve; });
  let priorChecks = 0;
  priorClaimBarrier = async () => {
    priorChecks += 1;
    if (priorChecks === 1) await bothPriorChecksStarted;
    else releasePriorChecks();
    return null;
  };
  let releaseFirstHistory!: () => void;
  const secondHistoryStarted = new Promise<void>((resolve) => { releaseFirstHistory = resolve; });
  let historyCalls = 0;
  RedeemedVoucher.create.mockImplementation(async () => {
    historyCalls += 1;
    if (historyCalls === 1) {
      await secondHistoryStarted;
      return [{}];
    }
    releaseFirstHistory();
    throw Object.assign(new Error('duplicate'), { code: 11000 });
  });

  const responses = await Promise.all([
    claim(campaignId, customerToken),
    claim(campaignId, customerToken),
  ]);

  expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
  expect(vouchers.filter((voucher) => voucher.isRedeemed)).toHaveLength(1);
  expect(responses.find((response) => response.status === 409)?.body.data).toBeNull();
});

it('lets different customers receive different campaign codes', async () => {
  campaigns.push(makeCampaign());
  vouchers.push(
    makeCampaignVoucher({ _id: voucherId1, code: 'FIRST' }),
    makeCampaignVoucher({ _id: voucherId2, code: 'SECOND' }),
  );

  const responses = await Promise.all([
    claim(campaignId, customerToken),
    claim(campaignId, signAuthToken({ userId: otherCustomerId }, '1h')),
  ]);

  expect(responses.map((response) => response.status)).toEqual([200, 200]);
  expect(new Set(responses.map((response) => response.body.data.voucher.code)).size).toBe(2);
});
```

Have the `Voucher.findOne` mock call `priorClaimBarrier` only when its query contains `redeemedBy`; reset that optional barrier in `beforeEach`. The two barriers model transaction isolation: both requests pass the historical check, then tentatively select distinct vouchers before the unique index rejects one. In the `Voucher.findOneAndUpdate` and `Campaign.findOneAndUpdate` mocks, call `updateWithUndo(document, changes, options.session)`; do not restore another session's writes.

Treat concurrency verification as three explicit layers, not as a claim that Vitest runs MongoDB: Task 1 proves the Mongoose partial unique-index definition, `server/lib/transaction.test.ts` proves callbacks execute through `session.withTransaction`, and this concurrent Supertest case proves duplicate-key translation plus request-local rollback/no-code behavior. Do not add `mongodb-memory-server` or write to a developer or production Atlas database merely to combine those layers.

Add a final-code test that asserts the campaign becomes `completed` and a historical-claim test that asserts no inventory mutation or code occurs. The snippets above lock duplicate-key-to-`409`, rollback, no-code-on-failure, and distinct winners.

- [ ] **Step 3: Write failing history-order regression**

In `server/routes/vouchers.test.ts`:

```ts
const voucherSort = vi.fn(() => voucherQueryChain);

it('orders an authenticated customer recent redemption before public inventory', async () => {
  await request(createApp())
    .get('/api/vouchers')
    .set('Cookie', [`auth_token=${customerToken}`])
    .expect(200);

  expect(voucherSort).toHaveBeenCalledWith({ redeemedAt: -1, donatedAt: -1 });
});
```

Replace the current plain `sort` method in the test's Voucher query chain with `sort: voucherSort` so the assertion observes the route call without issuing a second query.

- [ ] **Step 4: Run focused tests and verify RED**

Run: `npm test -- server/routes/offers.test.ts server/routes/vouchers.test.ts server/models/model.test.ts server/lib/transaction.test.ts`

Expected: FAIL because the claim route and recent-history ordering are missing.

- [ ] **Step 5: Implement the transactional claim**

Add the route after `requireAuth` and `requireRole('customer')`. Inside `withTransaction` use the full availability predicate on every read:

```ts
const result = await withTransaction(async (session) => {
  const campaign = await Campaign.findOne({ _id: campaignId }, null, { session });
  if (!campaign) throw new ApiError(404, 'Campaign not found');
  if (campaign.status !== 'active' || campaign.expiryDate <= now) {
    throw new ApiError(409, 'Campaign offer is no longer claimable');
  }

  const priorClaim = await Voucher.findOne({
    campaignId,
    sourceType: 'campaign',
    isRedeemed: true,
    redeemedBy: userId,
  }, { _id: 1 }, { session });
  if (priorClaim) throw new ApiError(409, 'Campaign already claimed');

  const voucher = await Voucher.findOneAndUpdate(
    {
      campaignId,
      sourceType: 'campaign',
      isActive: true,
      isRedeemed: false,
      expiryDate: { $gt: now },
    },
    { $set: { isRedeemed: true, redeemedBy: userId, redeemedAt: now } },
    { new: true, session, sort: { _id: 1 } },
  );
  if (!voucher) throw new ApiError(409, 'Campaign offer is no longer claimable');

  await RedeemedVoucher.create([{
    userId,
    voucherId: voucher._id,
    campaignId: campaign._id,
    redeemedAt: now,
  }], { session });

  const remaining = await Voucher.findOne({
    campaignId,
    sourceType: 'campaign',
    isActive: true,
    isRedeemed: false,
    expiryDate: { $gt: now },
  }, { _id: 1 }, { session });
  if (!remaining) {
    await Campaign.findOneAndUpdate(
      { _id: campaignId, status: 'active' },
      { $set: { status: 'completed' } },
      { session },
    );
  }

  const profile = await BusinessProfile.findOne({ _id: campaign.businessProfileId }, null, { session });
  return { voucher, campaign, profile };
});
```

Catch Mongo error code `11000` outside the transaction and translate it to `ApiError(409, 'Campaign already claimed')`. Serialize the successful voucher with campaign/profile attribution and the claimant ID so only the winner receives `code`.

- [ ] **Step 6: Make recent claimed codes visible in history**

In `GET /api/vouchers`, select sort order by viewer:

```ts
const sort = viewerId
  ? { redeemedAt: -1 as const, donatedAt: -1 as const }
  : { donatedAt: -1 as const };

const vouchers = await Voucher.find(query).sort(sort).skip(offset).limit(limit).lean();
```

The claim response remains the immediate source of truth in the dialog; this ordering ensures a newly claimed older campaign voucher is also first in the next authenticated history fetch.

- [ ] **Step 7: Run focused tests and verify GREEN**

Run: `npm test -- server/routes/offers.test.ts server/routes/vouchers.test.ts server/models/model.test.ts server/lib/transaction.test.ts`

Expected: PASS with one winner, transaction rollback, final campaign completion, and history access proven.

- [ ] **Step 8: Commit campaign claims**

```bash
git add server/routes/offers.ts server/routes/offers.test.ts server/routes/vouchers.ts server/routes/vouchers.test.ts
git commit -m "feat: claim one code from a campaign offer"
```

---

## Task 7: Grouped Campaign Offer Views And Backend Gate

**Files:**
- Modify: `server/routes/offers.ts`
- Modify: `server/routes/offers.test.ts`
- Modify: `server/routes/vouchers.ts`
- Modify: `server/routes/vouchers.test.ts`
- Modify: `src/services/voucher.service.ts`
- Modify: `src/services/voucher.service.test.ts`
- Modify: `src/components/VoucherCard.tsx`
- Modify: `src/components/VoucherCard.test.tsx`

**Interfaces:**
- Consumes: grouped campaign identity and existing aggregate analytics that sum inventory `viewCount`.
- Produces: `POST /api/offers/campaign/:campaignId/view -> { recorded: true }`; no individual campaign inventory view endpoint or client call.

- [ ] **Step 1: Write failing grouped-view route tests**

Add to `server/routes/offers.test.ts`:

```ts
it('records a grouped campaign view on one stable eligible voucher', async () => {
  campaigns.push(makeCampaign({ _id: campaignId, status: 'active' }));
  vouchers.push(
    makeCampaignVoucher({ _id: voucherId2, campaignId, viewCount: 2 }),
    makeCampaignVoucher({ _id: voucherId1, campaignId, viewCount: 4 }),
  );

  const response = await request(createApp())
    .post(`/api/offers/campaign/${campaignId}/view`)
    .expect(200);

  expect(response.body).toEqual({ data: { recorded: true }, error: null });
  expect(Voucher.findOneAndUpdate).toHaveBeenCalledWith(
    expect.objectContaining({ campaignId, sourceType: 'campaign' }),
    { $inc: { viewCount: 1 } },
    { new: true, sort: { _id: 1 } },
  );
});
```

Add malformed ID `400` and valid missing/completed/expired/sold-out no-op `200` cases. Assert no response includes a voucher, ID, or code.

Use one table to lock every no-op state:

```ts
it.each(['missing', 'completed', 'expired', 'sold-out'])(
  'treats %s campaign offer views as a private no-op',
  async (state) => {
    arrangeViewState(state);
    const response = await request(createApp())
      .post(`/api/offers/campaign/${campaignId}/view`)
      .expect(200);

    expect(response.body).toEqual({ data: { recorded: true }, error: null });
    expect(JSON.stringify(response.body)).not.toMatch(/code|voucherId|campaignId/);
    expect(vouchers.every((voucher) => voucher.viewCount === 0)).toBe(true);
  },
);

const arrangeViewState = (state: 'missing' | 'completed' | 'expired' | 'sold-out') => {
  if (state === 'missing') return;
  campaigns.push(makeCampaign({
    _id: campaignId,
    status: state === 'completed' ? 'completed' : 'active',
    expiryDate: state === 'expired' ? new Date(Date.now() - 60_000) : new Date(Date.now() + 60_000),
  }));
  if (state !== 'sold-out') {
    vouchers.push(makeCampaignVoucher({ _id: voucherId1, campaignId, viewCount: 0 }));
  }
};
```

- [ ] **Step 2: Write failing obsolete-path tests**

Change `server/routes/vouchers.test.ts` to expect `POST /api/vouchers/:id/view` to return `404`. Remove `recordView` mocks/assertions from `VoucherCard.test.tsx`, then assert opening a claimed campaign history card does not call a voucher service.

- [ ] **Step 3: Run focused tests and verify RED**

Run: `npm test -- server/routes/offers.test.ts server/routes/vouchers.test.ts src/components/VoucherCard.test.tsx src/services/voucher.service.test.ts`

Expected: FAIL because grouped views are missing and the old inventory-ID path still exists.

- [ ] **Step 4: Implement grouped best-effort view recording**

Add to `server/routes/offers.ts`:

```ts
router.post('/campaign/:campaignId/view', asyncRoute(async (req, res) => {
  await connectDb();
  const campaignId = req.params.campaignId;
  if (!mongoose.isValidObjectId(campaignId)) throw new ApiError(400, 'Invalid campaign id');

  const now = new Date();
  const campaign = await Campaign.exists({ _id: campaignId, status: 'active', expiryDate: { $gt: now } });
  if (campaign) {
    await Voucher.findOneAndUpdate(
      { campaignId, sourceType: 'campaign', isActive: true, isRedeemed: false, expiryDate: { $gt: now } },
      { $inc: { viewCount: 1 } },
      { new: true, sort: { _id: 1 } },
    );
  }

  ok(res, { recorded: true });
}));
```

- [ ] **Step 5: Remove inventory-ID view tracking**

Delete `POST /:id/view` from `server/routes/vouchers.ts`, `voucherService.recordView`, and the campaign-view block in `VoucherCard.handleOpenChange`. Keep campaign attribution and claimed-code behavior for dashboard history.

- [ ] **Step 6: Run the backend milestone gate**

Run:

```bash
npm test -- server/lib/offer-cursor.test.ts server/lib/offer-query.test.ts server/lib/offer-serializer.test.ts server/routes/offers.test.ts server/routes/vouchers.test.ts server/models/model.test.ts server/lib/campaign-analytics.test.ts src/components/VoucherCard.test.tsx src/services/voucher.service.test.ts
npm test
npm run type-check
npm run lint
npm run build:production
```

Expected: all tests/type-check/build pass; lint has zero errors and no new warnings beyond the recorded baseline.

- [ ] **Step 7: Commit grouped view tracking**

```bash
git add server/routes/offers.ts server/routes/offers.test.ts server/routes/vouchers.ts server/routes/vouchers.test.ts src/services/voucher.service.ts src/services/voucher.service.test.ts src/components/VoucherCard.tsx src/components/VoucherCard.test.tsx
git commit -m "feat: track grouped campaign offer views"
```

---

## Task 8: Frontend Offer Types, Service, And Infinite Query

**Files:**
- Modify: `src/lib/types.ts`
- Create: `src/services/offer.service.ts`
- Create: `src/services/offer.service.test.ts`
- Create: `src/hooks/useOffersQuery.ts`
- Create: `src/hooks/useOffersQuery.test.ts`

**Interfaces:**
- Consumes: Task 7 `/api/offers` list/claim/view contracts, `apiRequest`, `useAuth`, `vouchersQueryKey`.
- Produces: `Offer`, `OfferFilters`, `OfferPage`, `offerService`, `offersQueryKey`, `offerQueryKeys.list(viewerKey, filters)`, `useOffersQuery(filters)`, `flattenOfferPages(pages)`, `useClaimCampaignMutation()`.

- [ ] **Step 1: Write failing service contract tests**

Create `src/services/offer.service.test.ts`:

```ts
const apiCommunityOffer = {
  kind: 'community' as const,
  id: 'community-1',
  sourceType: 'community' as const,
  platform: 'Google Pay' as const,
  category: null,
  title: 'Community reward',
  description: 'Shared reward',
  imageUrl: 'https://example.com/community.png',
  expiryDate: '2026-09-01T00:00:00.000Z',
  donatedBy: 'anonymous',
  donatedAt: '2026-08-23T00:00:00.000Z',
  isRedeemed: false,
  reportCount: 0,
  isActive: true,
};
const apiCampaignOffer = {
  kind: 'campaign' as const,
  id: 'campaign-1',
  title: 'Campaign reward',
  description: 'Published reward',
  terms: 'One use per customer',
  platform: 'Google Pay' as const,
  category: 'Shopping' as const,
  imageUrl: 'https://example.com/campaign.png',
  expiryDate: '2026-09-02T00:00:00.000Z',
  brandName: 'Fresh Rewards',
  organizationName: 'Fresh Market Ltd',
  remainingCount: 3,
};
const apiClaimedVoucher = {
  id: 'campaign-voucher-1',
  sourceType: 'campaign' as const,
  platform: 'Google Pay' as const,
  title: 'Campaign reward',
  description: 'Published reward',
  code: 'ASSIGNED-CODE',
  imageUrl: 'https://example.com/campaign.png',
  expiryDate: '2026-09-02T00:00:00.000Z',
  donatedBy: 'business-1',
  donatedAt: '2026-08-20T00:00:00.000Z',
  isRedeemed: true,
  redeemedBy: 'customer-1',
  redeemedAt: '2026-08-23T01:00:00.000Z',
  reportCount: 0,
  isActive: true,
  category: 'Shopping' as const,
};

it('serializes canonical filters and hydrates offer dates', async () => {
  mockedApiRequest.mockResolvedValue({
    offers: [apiCommunityOffer, apiCampaignOffer],
    total: 2,
    nextCursor: 'opaque-cursor',
    hasMore: true,
  });

  const page = await offerService.list({
    q: 'fresh',
    platform: 'Google Pay',
    category: 'Shopping',
    source: 'campaign',
    expiringSoon: true,
  }, null);

  expect(mockedApiRequest).toHaveBeenCalledWith(
    '/api/offers?q=fresh&platform=Google+Pay&category=Shopping&source=campaign&expiringSoon=true&limit=24',
  );
  expect(page.offers[0].expiryDate).toBeInstanceOf(Date);
  expect(page.offers[0]).toHaveProperty('category', undefined);
  expect(page.nextCursor).toBe('opaque-cursor');
});

it('calls campaign claim and view endpoints without exposing inventory ids', async () => {
  mockedApiRequest
    .mockResolvedValueOnce({ voucher: apiClaimedVoucher, message: 'Campaign voucher claimed' })
    .mockResolvedValueOnce({ recorded: true });

  await offerService.claimCampaign('campaign-1');
  await offerService.recordCampaignView('campaign-1');

  expect(mockedApiRequest).toHaveBeenNthCalledWith(1, '/api/offers/campaign/campaign-1/claim', { method: 'POST' });
  expect(mockedApiRequest).toHaveBeenNthCalledWith(2, '/api/offers/campaign/campaign-1/view', { method: 'POST' });
});
```

- [ ] **Step 2: Write failing infinite-query and mutation tests**

Create `src/hooks/useOffersQuery.test.ts` using a real `QueryClientProvider`:

```ts
const customer: User = {
  id: 'customer-1',
  email: 'customer@example.com',
  username: 'customer',
  role: 'customer',
  createdAt: new Date('2026-08-23T00:00:00.000Z'),
  redeemedVouchers: [],
};
const community = (id: string): CommunityOffer => ({
  kind: 'community',
  id,
  sourceType: 'community',
  platform: 'Google Pay',
  category: undefined,
  title: 'Community reward',
  description: 'Shared reward',
  imageUrl: 'https://example.com/community.png',
  expiryDate: new Date('2026-09-01T00:00:00.000Z'),
  donatedBy: 'anonymous',
  donatedAt: new Date('2026-08-23T00:00:00.000Z'),
  isRedeemed: false,
  reportCount: 0,
  isActive: true,
});
const campaign = (id: string): CampaignOffer => ({
  kind: 'campaign',
  id,
  title: 'Campaign reward',
  description: 'Published reward',
  terms: 'One use per customer',
  platform: 'Google Pay',
  category: 'Shopping',
  imageUrl: 'https://example.com/campaign.png',
  expiryDate: new Date('2026-09-02T00:00:00.000Z'),
  brandName: 'Fresh Rewards',
  organizationName: 'Fresh Market Ltd',
  remainingCount: 3,
});
const { kind: _kind, ...claimedBase } = community('campaign-voucher-1');
const claimedVoucher: ResolvedVoucher = {
  ...claimedBase,
  sourceType: 'campaign',
  code: 'ASSIGNED-CODE',
  isRedeemed: true,
  redeemedBy: customer.id,
  redeemedAt: new Date('2026-08-23T01:00:00.000Z'),
};
const defaultFilters: OfferFilters = { q: '', source: 'all', expiringSoon: false };
const firstPage: OfferPage = {
  offers: [community('community-1')],
  total: 2,
  nextCursor: 'opaque-cursor',
  hasMore: true,
};
const secondPage: OfferPage = {
  offers: [campaign('campaign-1')],
  total: 2,
  nextCursor: null,
  hasMore: false,
};

it('uses viewer identity and the exact opaque cursor for the next page', async () => {
  offerService.list
    .mockResolvedValueOnce(firstPage)
    .mockResolvedValueOnce(secondPage);

  const { result } = renderHook(() => useOffersQuery(defaultFilters), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  await result.current.fetchNextPage();

  expect(offerService.list).toHaveBeenNthCalledWith(1, defaultFilters, null);
  expect(offerService.list).toHaveBeenNthCalledWith(2, defaultFilters, firstPage.nextCursor);
  expect(queryClient.getQueryCache().findAll({ queryKey: offersQueryKey })[0]?.queryKey)
    .toContain(customer.id);
});

it('deduplicates only the same kind and id', () => {
  expect(flattenOfferPages([
    { ...firstPage, offers: [community('same-id'), campaign('same-id')] },
    { ...secondPage, offers: [community('same-id')] },
  ])).toHaveLength(2);
});

it('keeps the claimed voucher and invalidates offer and voucher caches', async () => {
  const response = { voucher: claimedVoucher, message: 'Campaign voucher claimed' };
  offerService.claimCampaign.mockResolvedValue(response);
  let resolveRefresh!: () => void;
  const refreshPending = new Promise<void>((resolve) => { resolveRefresh = resolve; });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockReturnValue(refreshPending);
  const { result } = renderHook(() => useClaimCampaignMutation(), { wrapper });

  await act(async () => result.current.mutateAsync('campaign-1'));

  expect(result.current.data).toEqual(response);
  expect(queryClient.getQueryData(vouchersQueryKey)).toEqual([claimedVoucher]);
  expect(invalidate).toHaveBeenCalledWith({ queryKey: offersQueryKey });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: vouchersQueryKey });
  resolveRefresh();
});

it('refreshes discovery after a claim conflict', async () => {
  offerService.claimCampaign.mockRejectedValue(new ApiClientError('conflict', 409));
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const { result } = renderHook(() => useClaimCampaignMutation(), { wrapper });

  await expect(result.current.mutateAsync('campaign-1')).rejects.toMatchObject({ status: 409 });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: offersQueryKey });
});
```

- [ ] **Step 3: Run focused tests and verify RED**

Run: `npm test -- src/services/offer.service.test.ts src/hooks/useOffersQuery.test.ts`

Expected: FAIL because frontend offer contracts and data access do not exist.

- [ ] **Step 4: Add exact frontend contracts**

Append to `src/lib/types.ts`:

```ts
export type OfferKind = 'community' | 'campaign';
export type OfferSourceFilter = 'all' | OfferKind;

export interface OfferFilters {
  q: string;
  platform?: VoucherPlatform;
  category?: VoucherCategory;
  source: OfferSourceFilter;
  expiringSoon: boolean;
}

export interface OfferBase {
  id: string;
  kind: OfferKind;
  title: string;
  description: string;
  platform: VoucherPlatform;
  category: VoucherCategory | undefined;
  imageUrl: string;
  expiryDate: Date | undefined;
  value?: string;
}

export interface CommunityOffer extends OfferBase {
  kind: 'community';
  sourceType: 'community';
  donatedBy: string;
  donatedAt: Date;
  isRedeemed: false;
  reportCount: number;
  isActive: true;
}

export interface CampaignOffer extends OfferBase {
  kind: 'campaign';
  terms: string;
  category: VoucherCategory;
  expiryDate: Date;
  brandName: string;
  organizationName: string;
  remainingCount: number;
}

export type Offer = CommunityOffer | CampaignOffer;
export interface OfferPage {
  offers: Offer[];
  total: number;
  nextCursor: string | null;
  hasMore: boolean;
}
export interface CampaignClaimResponse { voucher: ResolvedVoucher; message: string }
```

Add a compile-time contract test so discovery types cannot regress toward private voucher records:

```ts
type CommunityOfferHasCode = 'code' extends keyof CommunityOffer ? true : false;
expectTypeOf<CommunityOfferHasCode>().toEqualTypeOf<false>();
expectTypeOf<CampaignOffer['value']>().toEqualTypeOf<string | undefined>();
```

- [ ] **Step 5: Implement offer service hydration**

Create `src/services/offer.service.ts`. Omit empty/default filters, always send `limit=24`, preserve cursors exactly, and hydrate every `expiryDate`, community `donatedAt`, and claimed voucher date.

```ts
type ApiCommunityOffer = Omit<CommunityOffer, 'expiryDate' | 'category' | 'donatedAt'> & {
  expiryDate: string | Date | null;
  category: VoucherCategory | null;
  donatedAt: string | Date;
};
type ApiCampaignOffer = Omit<CampaignOffer, 'expiryDate'> & { expiryDate: string | Date };
type ApiOfferPage = Omit<OfferPage, 'offers'> & { offers: Array<ApiCommunityOffer | ApiCampaignOffer> };
type ApiCampaignClaimResponse = Omit<CampaignClaimResponse, 'voucher'> & {
  voucher: Omit<ResolvedVoucher, 'donatedAt' | 'expiryDate' | 'redeemedAt'> & {
    donatedAt: string | Date;
    expiryDate?: string | Date;
    redeemedAt?: string | Date;
  };
};

const hydrateVoucher = (voucher: ApiCampaignClaimResponse['voucher']): ResolvedVoucher => ({
  ...voucher,
  sourceType: voucher.sourceType ?? 'community',
  donatedAt: new Date(voucher.donatedAt),
  ...(voucher.expiryDate ? { expiryDate: new Date(voucher.expiryDate) } : {}),
  ...(voucher.redeemedAt ? { redeemedAt: new Date(voucher.redeemedAt) } : {}),
});

const toOfferQueryParams = (filters: OfferFilters, cursor: string | null) => {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.platform) params.set('platform', filters.platform);
  if (filters.category) params.set('category', filters.category);
  if (filters.source !== 'all') params.set('source', filters.source);
  if (filters.expiringSoon) params.set('expiringSoon', 'true');
  params.set('limit', '24');
  if (cursor) params.set('cursor', cursor);
  return params;
};

const hydrateOfferPage = (page: ApiOfferPage): OfferPage => ({
  ...page,
  offers: page.offers.map((offer) => offer.kind === 'campaign'
    ? { ...offer, expiryDate: new Date(offer.expiryDate) }
    : {
        ...offer,
        donatedAt: new Date(offer.donatedAt),
        expiryDate: offer.expiryDate ? new Date(offer.expiryDate) : undefined,
        category: offer.category ?? undefined,
      }),
});

export const offerService = {
  list: async (filters: OfferFilters, cursor: string | null): Promise<OfferPage> => {
    const params = toOfferQueryParams(filters, cursor);
    const page = await apiRequest<ApiOfferPage>(`/api/offers?${params}`);
    return hydrateOfferPage(page);
  },
  claimCampaign: async (campaignId: string): Promise<CampaignClaimResponse> => {
    const result = await apiRequest<ApiCampaignClaimResponse>(`/api/offers/campaign/${campaignId}/claim`, { method: 'POST' });
    return { ...result, voucher: hydrateVoucher(result.voucher) };
  },
  recordCampaignView: (campaignId: string) => apiRequest<{ recorded: true }>(
    `/api/offers/campaign/${campaignId}/view`,
    { method: 'POST' },
  ),
};
```

Mock `useAuth` to return `{ user: customer, isLoading: false }`. In `beforeEach`, create a retry-disabled `QueryClient`, a `QueryClientProvider` wrapper, and reset the mocked `offerService` methods; destroy/clear the client after each test so mutation/query state cannot leak between cases.

- [ ] **Step 6: Implement viewer-aware infinite query and claim mutation**

Create `src/hooks/useOffersQuery.ts`:

```ts
export const offersQueryKey = ['offers'] as const;
export const offerQueryKeys = {
  all: offersQueryKey,
  list: (viewerKey: string, filters: OfferFilters) => [...offersQueryKey, viewerKey, filters] as const,
};

export const useOffersQuery = (filters: OfferFilters) => {
  const { user, isLoading } = useAuth();
  return useInfiniteQuery({
    queryKey: offerQueryKeys.list(user?.id ?? 'anonymous', filters),
    queryFn: ({ pageParam }) => offerService.list(filters, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: !isLoading,
  });
};

export const flattenOfferPages = (pages: OfferPage[]) => {
  const seen = new Set<string>();
  return pages.flatMap((page) => page.offers).filter((offer) => {
    const key = `${offer.kind}:${offer.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
```

Implement `useClaimCampaignMutation()` with `offerService.claimCampaign` and invalidation of `offersQueryKey` and `vouchersQueryKey` on success. Do not clear mutation `data`; the persistent dialog needs it after refetch.

```ts
export const useClaimCampaignMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: offerService.claimCampaign,
    onSuccess: ({ voucher }) => {
      queryClient.setQueryData<ResolvedVoucher[]>(vouchersQueryKey, (current) => [
        voucher,
        ...(current ?? []).filter((item) => item.id !== voucher.id),
      ]);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: offersQueryKey }),
        queryClient.invalidateQueries({ queryKey: vouchersQueryKey }),
      ]).catch((error) => {
        offerLogger.error('Error refreshing data after campaign claim', error);
      });
    },
    onError: (error) => {
      if (error instanceof ApiClientError && error.status === 409) {
        void queryClient.invalidateQueries({ queryKey: offersQueryKey });
      }
    },
  });
};
```

- [ ] **Step 7: Run focused tests and verify GREEN**

Run: `npm test -- src/services/offer.service.test.ts src/hooks/useOffersQuery.test.ts src/services/api-client.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit the frontend data layer**

```bash
git add src/lib/types.ts src/services/offer.service.ts src/services/offer.service.test.ts src/hooks/useOffersQuery.ts src/hooks/useOffersQuery.test.ts
git commit -m "feat: query paginated marketplace offers"
```

---

## Task 9: Canonical URL Filters

**Files:**
- Create: `src/lib/offer-filters.ts`
- Create: `src/lib/offer-filters.test.ts`
- Create: `src/components/OfferFilters.tsx`
- Create: `src/components/OfferFilters.test.tsx`

**Interfaces:**
- Consumes: `OfferFilters`, current `URLSearchParams`, existing Input/Select/Switch/Button primitives.
- Produces: `DEFAULT_OFFER_FILTERS`, `parseOfferFilters(params)`, `writeOfferFilters(current, filters)`, `hasActiveOfferFilters(filters)`, and `<OfferFilters filters onChange />` with a 300ms search debounce.

- [ ] **Step 1: Write failing canonical URL tests**

Create `src/lib/offer-filters.test.ts`:

```ts
it('parses supported URL state and ignores invalid values', () => {
  expect(parseOfferFilters(new URLSearchParams(
    'q=fresh&platform=Google+Pay&category=Shopping&source=campaign&expiring=true',
  ))).toEqual({
    q: 'fresh',
    platform: 'Google Pay',
    category: 'Shopping',
    source: 'campaign',
    expiringSoon: true,
  });

  expect(parseOfferFilters(new URLSearchParams(
    'platform=Unknown&category=Unknown&source=paid&expiring=false',
  ))).toEqual(DEFAULT_OFFER_FILTERS);
});

it('writes only non-default offer filters and preserves unrelated params', () => {
  const params = writeOfferFilters(new URLSearchParams('ref=landing'), {
    ...DEFAULT_OFFER_FILTERS,
    q: 'coffee',
    source: 'campaign',
  });

  expect(params.toString()).toBe('ref=landing&q=coffee&source=campaign');
});
```

- [ ] **Step 2: Write failing interaction and back-navigation tests**

Create `src/components/OfferFilters.test.tsx` with fake timers:

```ts
it('debounces search but applies selects and expiry immediately', async () => {
  vi.useFakeTimers();
  const onChange = vi.fn();
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<OfferFilters filters={DEFAULT_OFFER_FILTERS} onChange={onChange} />);

  await user.type(screen.getByRole('searchbox', { name: 'search offers' }), 'coffee');
  expect(onChange).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(300));
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ q: 'coffee' }), { replace: true });

  await user.click(screen.getByRole('switch', { name: 'expiring within 7 days' }));
  expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ expiringSoon: true }), { replace: false });
});
```

Rerender with a different `filters.q` and assert local search text follows it, proving browser back/forward cannot be overwritten by a stale timer. Test clear filters, `maxLength=100`, all platform/category/source options, and explicit labels.

- [ ] **Step 3: Run focused tests and verify RED**

Run: `npm test -- src/lib/offer-filters.test.ts src/components/OfferFilters.test.tsx`

Expected: FAIL because the URL helpers and controls are missing.

- [ ] **Step 4: Implement canonical parse/write helpers**

Create `src/lib/offer-filters.ts`:

```ts
export const VOUCHER_PLATFORMS: VoucherPlatform[] = ['Google Pay', 'Paytm', 'PhonePe', 'Other'];
export const VOUCHER_CATEGORIES: VoucherCategory[] = [
  'Food', 'Shopping', 'Travel', 'Entertainment', 'Electronics', 'Health', 'Other',
];
export const OFFER_SOURCES: OfferSourceFilter[] = ['all', 'community', 'campaign'];

const isVoucherPlatform = (value: string | null): value is VoucherPlatform => (
  value !== null && VOUCHER_PLATFORMS.includes(value as VoucherPlatform)
);
const isVoucherCategory = (value: string | null): value is VoucherCategory => (
  value !== null && VOUCHER_CATEGORIES.includes(value as VoucherCategory)
);
const isOfferSource = (value: string | null): value is OfferSourceFilter => (
  value !== null && OFFER_SOURCES.includes(value as OfferSourceFilter)
);

export const DEFAULT_OFFER_FILTERS: OfferFilters = {
  q: '',
  source: 'all',
  expiringSoon: false,
};

export const parseOfferFilters = (params: URLSearchParams): OfferFilters => ({
  q: (params.get('q') ?? '').trim().slice(0, 100),
  ...(isVoucherPlatform(params.get('platform')) ? { platform: params.get('platform') as VoucherPlatform } : {}),
  ...(isVoucherCategory(params.get('category')) ? { category: params.get('category') as VoucherCategory } : {}),
  source: isOfferSource(params.get('source')) ? params.get('source') as OfferSourceFilter : 'all',
  expiringSoon: params.get('expiring') === 'true',
});

export const writeOfferFilters = (current: URLSearchParams, filters: OfferFilters) => {
  const next = new URLSearchParams(current);
  ['q', 'platform', 'category', 'source', 'expiring'].forEach((key) => next.delete(key));
  if (filters.q) next.set('q', filters.q);
  if (filters.platform) next.set('platform', filters.platform);
  if (filters.category) next.set('category', filters.category);
  if (filters.source !== 'all') next.set('source', filters.source);
  if (filters.expiringSoon) next.set('expiring', 'true');
  return next;
};

export const hasActiveOfferFilters = (filters: OfferFilters) => Boolean(
  filters.q || filters.platform || filters.category || filters.source !== 'all' || filters.expiringSoon
);
```

- [ ] **Step 5: Implement accessible filter controls**

`OfferFilters` keeps only draft search text locally. Synchronize it from `filters.q`, cancel the prior timer on every change/unmount, and call `onChange(next, { replace: true })` after 300ms. Platform, category, source, expiry, and clear actions call immediately with `{ replace: false }`.

Use this exact local-state boundary:

```ts
const [draftSearch, setDraftSearch] = useState(filters.q);
const filtersRef = useRef(filters);
filtersRef.current = filters;

useEffect(() => setDraftSearch(filters.q), [filters.q]);
useEffect(() => {
  if (draftSearch === filters.q) return undefined;
  const timer = window.setTimeout(() => {
    onChange({ ...filtersRef.current, q: draftSearch.trim() }, { replace: true });
  }, 300);
  return () => window.clearTimeout(timer);
}, [draftSearch, filters.q, onChange]);

const updateImmediately = (patch: Partial<OfferFilters>) => {
  onChange({ ...filters, ...patch }, { replace: false });
};
```

Use these labels and values exactly:

```tsx
<Input type="search" role="searchbox" aria-label="search offers" maxLength={100} />
<Select value={filters.platform ?? 'all'} onValueChange={(value) => updateImmediately({
  platform: value === 'all' ? undefined : value as VoucherPlatform,
})}>
  <SelectTrigger aria-label="platform"><SelectValue /></SelectTrigger>
  <SelectContent>
    <SelectItem value="all">all platforms</SelectItem>
    {VOUCHER_PLATFORMS.map((platform) => <SelectItem key={platform} value={platform}>{platform.toLowerCase()}</SelectItem>)}
  </SelectContent>
</Select>
<Select value={filters.category ?? 'all'} onValueChange={(value) => updateImmediately({
  category: value === 'all' ? undefined : value as VoucherCategory,
})}>
  <SelectTrigger aria-label="category"><SelectValue /></SelectTrigger>
  <SelectContent>
    <SelectItem value="all">all categories</SelectItem>
    {VOUCHER_CATEGORIES.map((category) => <SelectItem key={category} value={category}>{category.toLowerCase()}</SelectItem>)}
  </SelectContent>
</Select>
<Select value={filters.source} onValueChange={(value) => updateImmediately({ source: value as OfferSourceFilter })}>
  <SelectTrigger aria-label="source"><SelectValue /></SelectTrigger>
  <SelectContent>
    <SelectItem value="all">all sources</SelectItem>
    <SelectItem value="community">community</SelectItem>
    <SelectItem value="campaign">business campaigns</SelectItem>
  </SelectContent>
</Select>
<Label htmlFor="expiring-soon">expiring within 7 days</Label>
<Switch
  id="expiring-soon"
  checked={filters.expiringSoon}
  onCheckedChange={(checked) => updateImmediately({ expiringSoon: checked })}
/>
```

Stack controls on mobile and use a compact wrapping row from `sm` upward. Standalone controls remain at least 44px high.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run: `npm test -- src/lib/offer-filters.test.ts src/components/OfferFilters.test.tsx`

Expected: PASS without timer leaks or accessibility warnings.

- [ ] **Step 7: Commit URL filters**

```bash
git add src/lib/offer-filters.ts src/lib/offer-filters.test.ts src/components/OfferFilters.tsx src/components/OfferFilters.test.tsx
git commit -m "feat: add shareable offer filters"
```

---

## Task 10: Campaign Offer Card And Persistent Claim Dialog

**Files:**
- Create: `src/components/CampaignOfferCard.tsx`
- Create: `src/components/CampaignOfferCard.test.tsx`
- Modify: `src/components/AuthHandoff.test.tsx`

**Interfaces:**
- Consumes: `CampaignOffer`, `useClaimCampaignMutation()`, `offerService.recordCampaignView()`, `useAuth`, `useAuthDialog`.
- Produces: `<CampaignOfferCard offer onOpen />` and `<CampaignOfferDialog offer open trigger onOpenChange />`; the dialog owns assigned-code state independently from the result grid.

- [ ] **Step 1: Write failing card content and accessibility tests**

Create `src/components/CampaignOfferCard.test.tsx`:

```ts
const campaignOffer: CampaignOffer = {
  kind: 'campaign',
  id: 'campaign-1',
  title: 'Weekend Reward',
  description: 'Use this weekend',
  terms: 'One use per customer',
  platform: 'Google Pay',
  category: 'Shopping',
  imageUrl: 'https://example.com/campaign.png',
  expiryDate: new Date('2026-09-01T00:00:00.000Z'),
  brandName: 'Fresh Rewards',
  organizationName: 'Fresh Market Ltd',
  remainingCount: 3,
};
const openDialog = vi.fn();
const customer: User = {
  id: 'customer-1',
  email: 'customer@example.com',
  username: 'customer',
  role: 'customer',
  createdAt: new Date('2026-08-23T00:00:00.000Z'),
  redeemedVouchers: [],
};
const claimedVoucher: ResolvedVoucher = {
  id: 'campaign-voucher-1',
  sourceType: 'campaign',
  platform: 'Google Pay',
  title: campaignOffer.title,
  description: campaignOffer.description,
  code: 'ASSIGNED-CODE',
  imageUrl: campaignOffer.imageUrl,
  expiryDate: campaignOffer.expiryDate,
  donatedBy: 'business-1',
  donatedAt: new Date('2026-08-20T00:00:00.000Z'),
  isRedeemed: true,
  redeemedBy: customer.id,
  redeemedAt: new Date('2026-08-23T01:00:00.000Z'),
  reportCount: 0,
  isActive: true,
  category: 'Shopping',
};

it('presents one grouped campaign with attribution and inventory', async () => {
  render(<CampaignOfferCard offer={campaignOffer} onOpen={openDialog} />);

  const trigger = screen.getByRole('button', {
    name: /Weekend Reward.*Google Pay.*Shopping.*Fresh Market Ltd.*Fresh Rewards.*3 available.*view details/i,
  });
  expect(trigger).toHaveTextContent('business campaign');
  expect(trigger).toHaveTextContent('Google Pay');
  expect(trigger).toHaveTextContent('Shopping');
  expect(trigger).toHaveTextContent('3 available');
  await userEvent.click(trigger);
  expect(openDialog).toHaveBeenCalledWith(campaignOffer, trigger);
});
```

Use the real `useClaimCampaignMutation` under a fresh `QueryClientProvider`. Mock `offerService.claimCampaign` as `claimCampaign`, mock `recordCampaignView`, and mock `useAuth`/`useAuthDialog` at their module boundaries. Implement `renderCampaignDialog({ user, offer })` by setting the auth mock and rendering an open `CampaignOfferDialog` with a connected button element as `trigger`; use a stateful harness for tests that close and reopen it.

- [ ] **Step 2: Write failing role, claim, and persistent-success tests**

Render `CampaignOfferDialog` as a controlled sibling and cover:

```ts
it('keeps the assigned code visible while offer queries refresh', async () => {
  claimCampaign.mockResolvedValue({ voucher: claimedVoucher, message: 'Campaign voucher claimed' });
  let resolveRefresh!: () => void;
  const refreshPending = new Promise<void>((resolve) => { resolveRefresh = resolve; });
  vi.spyOn(queryClient, 'invalidateQueries').mockReturnValue(refreshPending);
  renderCampaignDialog({ user: customer, offer: campaignOffer });

  await userEvent.click(screen.getByRole('button', { name: 'claim from campaign' }));

  expect(await screen.findByText('ASSIGNED-CODE')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'copy assigned code' })).toBeEnabled();
  expect(claimCampaign).toHaveBeenCalledWith(campaignOffer.id);
  resolveRefresh();
});
```

Also prove:

- Anonymous action closes details, opens shared auth, and restores focus.
- Business account sees `use a customer account to claim` and no claim button.
- Pending claim disables the button.
- `409` displays `this campaign is already claimed or no longer available` and retains details.
- Other errors show a retryable failure without a code.
- Clipboard success/failure uses existing toast patterns.
- Every closed-to-open transition sends one nonblocking campaign view; view failure logs but never toasts or blocks.
- Description, terms, organization, brand, category, expiry, and remaining count are visible and accessible.

- [ ] **Step 3: Extend the real auth handoff test**

In `src/components/AuthHandoff.test.tsx`, mount the controlled campaign dialog inside `AuthDialogProvider`, click `sign in to claim`, assert the details dialog closes before the auth textbox receives focus, then assert closing auth returns focus to the campaign card trigger.

- [ ] **Step 4: Run focused tests and verify RED**

Run: `npm test -- src/components/CampaignOfferCard.test.tsx src/components/AuthHandoff.test.tsx src/hooks/useOffersQuery.test.ts`

Expected: FAIL because the campaign trigger/dialog do not exist.

- [ ] **Step 5: Implement a trigger-only card and controlled dialog**

Keep the dialog outside the card's mapped lifetime. Use this exact selection boundary:

```ts
export type OpenCampaignOffer = (offer: CampaignOffer, trigger: HTMLButtonElement) => void;

export function CampaignOfferCard({ offer, onOpen }: {
  offer: CampaignOffer;
  onOpen: OpenCampaignOffer;
}) {
  return (
    <button
      type="button"
      aria-label={`${offer.title}, ${offer.platform}, ${offer.category}, business campaign, ${offer.organizationName}, ${offer.brandName}, ${offer.remainingCount} available, view details`}
      onClick={(event) => onOpen(offer, event.currentTarget)}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <span className="text-xs text-muted-foreground">business campaign</span>
          <p className="text-[11px] text-muted-foreground">
            {offer.organizationName} {offer.brandName}
          </p>
        </div>
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs">
          {offer.remainingCount} available
        </span>
      </div>
      <h3 className="mb-2 text-sm font-medium">{offer.title}</h3>
      <p className="mb-2 text-xs text-muted-foreground">{offer.platform} / {offer.category}</p>
      <p className="mb-4 line-clamp-2 text-xs text-muted-foreground">{offer.description}</p>
      <p className="text-xs text-muted-foreground">
        expires {offer.expiryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </p>
    </button>
  );
}
```

`CampaignOfferDialog` receives the offer snapshot and original trigger element. It calls `offerService.recordCampaignView(offer.id)` when `open` transitions from false to true. It uses `useClaimCampaignMutation`; mutation `data.voucher.code` is the assigned-code state and is reset only when the user closes the dialog or opens a different campaign.

Use this claim/view state boundary:

```ts
const claim = useClaimCampaignMutation();
const [claimConflict, setClaimConflict] = useState(false);
const previousOfferId = useRef<string | null>(null);

useEffect(() => {
  if (offer.id === previousOfferId.current) return;
  previousOfferId.current = offer.id;
  claim.reset();
  setClaimConflict(false);
}, [offer.id, claim.reset]);

useEffect(() => {
  if (!open || !offer) return;
  void offerService.recordCampaignView(offer.id).catch((error) => {
    logger.error('Error recording campaign offer view', error, { campaignId: offer.id });
  });
}, [open, offer]);

const handleClaim = async () => {
  if (!isAuthenticated) {
    setPendingAuthHandoff(true);
    onOpenChange(false);
    return;
  }
  try {
    setClaimConflict(false);
    await claim.mutateAsync(offer.id);
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 409) {
      setClaimConflict(true);
      return;
    }
    toast.error('failed to claim campaign voucher');
  }
};

const assignedCode = claim.data?.voucher.code;

const handleOpenChange = (nextOpen: boolean) => {
  if (!nextOpen) {
    claim.reset();
    setClaimConflict(false);
  }
  onOpenChange(nextOpen);
};
```

Render `assignedCode` in a monospace button named `copy assigned code`, the approved conflict copy when `claimConflict` is true, description and terms in separate labelled sections, and `claim from campaign` only for a customer account. Pass `handleOpenChange` to the dialog so closing is the only same-offer action that discards a successful code; offer-query invalidation and grid removal must not call it.

- [ ] **Step 6: Implement auth and focus handoff**

Match the existing `VoucherCard` pattern:

```tsx
<DialogContent
  onCloseAutoFocus={(event) => {
    if (pendingAuthHandoff) {
      event.preventDefault();
      setPendingAuthHandoff(false);
      openLogin(trigger);
      return;
    }
    if (trigger?.isConnected) trigger.focus();
  }}
>
```

On anonymous `sign in to claim`, set `pendingAuthHandoff`, then close the details dialog. Do not mount an additional auth modal.

- [ ] **Step 7: Run focused tests and verify GREEN**

Run: `npm test -- src/components/CampaignOfferCard.test.tsx src/components/AuthHandoff.test.tsx src/hooks/useOffersQuery.test.ts`

Expected: PASS, including persistent assigned-code state and nonblocking views.

- [ ] **Step 8: Commit campaign UI**

```bash
git add src/components/CampaignOfferCard.tsx src/components/CampaignOfferCard.test.tsx src/components/AuthHandoff.test.tsx
git commit -m "feat: add grouped campaign claim dialog"
```

---

## Task 11: Server-Driven Browse Composition

**Files:**
- Rewrite: `src/pages/Browse.tsx`
- Rewrite: `src/pages/Browse.test.tsx`

**Interfaces:**
- Consumes: `parseOfferFilters`, `writeOfferFilters`, `hasActiveOfferFilters`, `useOffersQuery`, `flattenOfferPages`, `OfferFilters`, `VoucherCard`, `CampaignOfferCard`, `CampaignOfferDialog`.
- Produces: URL-restorable available-only catalog, total offer count, mixed card grid, persistent selected-campaign snapshot, load-more states, retry, and distinct empty copy.

- [ ] **Step 1: Replace old client-filter tests with failing server-driven page tests**

Rewrite `src/pages/Browse.test.tsx` around mocked offer hooks and add:

```ts
const communityOffer: CommunityOffer = {
  kind: 'community',
  id: 'community-1',
  sourceType: 'community',
  platform: 'Google Pay',
  category: undefined,
  title: 'Community reward',
  description: 'Shared reward',
  imageUrl: 'https://example.com/community.png',
  expiryDate: new Date('2026-09-01T00:00:00.000Z'),
  donatedBy: 'anonymous',
  donatedAt: new Date('2026-08-23T00:00:00.000Z'),
  isRedeemed: false,
  reportCount: 0,
  isActive: true,
};
const campaignOffer: CampaignOffer = {
  kind: 'campaign',
  id: 'campaign-1',
  title: 'Weekend Reward',
  description: 'Use this weekend',
  terms: 'One use per customer',
  platform: 'Google Pay',
  category: 'Shopping',
  imageUrl: 'https://example.com/campaign.png',
  expiryDate: new Date('2026-09-02T00:00:00.000Z'),
  brandName: 'Fresh Rewards',
  organizationName: 'Fresh Market Ltd',
  remainingCount: 3,
};
const { kind: _kind, ...claimedBase } = communityOffer;
const claimedVoucher: ResolvedVoucher = {
  ...claimedBase,
  id: 'campaign-voucher-1',
  sourceType: 'campaign',
  code: 'ASSIGNED-CODE',
  isRedeemed: true,
  redeemedBy: 'customer-1',
  redeemedAt: new Date('2026-08-23T01:00:00.000Z'),
};
const fetchNextPage = vi.fn();
const refetch = vi.fn();
const baseQuery = {
  isPending: false,
  isError: false,
  isFetchNextPageError: false,
  isFetchingNextPage: false,
  hasNextPage: false,
  fetchNextPage,
  refetch,
};
const browseTree = (route = '/browse') => (
  <QueryClientProvider client={queryClient}>
    <MemoryRouter initialEntries={[route]}><Browse /></MemoryRouter>
  </QueryClientProvider>
);
const renderBrowse = (route = '/browse') => render(browseTree(route));

it('renders offer totals and the correct card for each union member', () => {
  useOffersQuery.mockReturnValue({
    ...baseQuery,
    data: { pages: [{ offers: [communityOffer, campaignOffer], total: 2, nextCursor: null, hasMore: false }] },
  });

  renderBrowse('/browse?source=campaign');

  expect(screen.getByText('2 offers found')).toBeInTheDocument();
  expect(screen.getByText(communityOffer.title)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Weekend Reward.*view details/i })).toBeInTheDocument();
  expect(useOffersQuery).toHaveBeenCalledWith(expect.objectContaining({ source: 'campaign' }));
});
```

Partially mock `@/hooks/useOffersQuery` so only `useOffersQuery` is replaced and the real `useClaimCampaignMutation` remains active. Mock `VoucherCard` as a simple article, but keep `CampaignOfferCard` and `CampaignOfferDialog` real. Create a fresh `QueryClient` in `beforeEach`, mock a signed-in customer, and make `offerService.claimCampaign` resolve the local `claimedVoucher` so the persistent-dialog test exercises real mutation state.

- [ ] **Step 2: Write failing pagination and state tests**

Cover:

```ts
it('keeps loaded offers while fetching and retries a later page failure', async () => {
  useOffersQuery.mockReturnValue({
    ...baseQuery,
    isError: true,
    isFetchNextPageError: true,
    hasNextPage: true,
    data: { pages: [{ offers: [communityOffer], total: 2, nextCursor: 'next', hasMore: true }] },
  });
  renderBrowse('/browse');

  expect(screen.getByText(communityOffer.title)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'retry loading more offers' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'retry loading more offers' }));
  expect(fetchNextPage).toHaveBeenCalledOnce();
});
```

Also test initial loading, first-page error/retry, `isFetchingNextPage` disabled copy, de-duplicated append, no active inventory, filtered empty with clear action, and no load-more button on the final page.

- [ ] **Step 3: Write the failing persistent-dialog integration test**

Use a stateful query mock:

```ts
it('keeps claim success mounted after the campaign leaves the grid', async () => {
  const firstPage = { offers: [campaignOffer], total: 1, nextCursor: null, hasMore: false };
  useOffersQuery.mockReturnValue({ ...baseQuery, data: { pages: [firstPage] } });
  const view = renderBrowse('/browse');
  await userEvent.click(screen.getByRole('button', { name: /Weekend Reward.*view details/i }));
  await userEvent.click(screen.getByRole('button', { name: 'claim from campaign' }));

  useOffersQuery.mockReturnValue({
    ...baseQuery,
    data: { pages: [{ offers: [], total: 0, nextCursor: null, hasMore: false }] },
  });
  view.rerender(browseTree('/browse'));

  expect(screen.queryByRole('button', { name: /Weekend Reward.*view details/i })).not.toBeInTheDocument();
  expect(screen.getByText('ASSIGNED-CODE')).toBeInTheDocument();
});
```

- [ ] **Step 4: Run focused tests and verify RED**

Run: `npm test -- src/pages/Browse.test.tsx src/components/OfferFilters.test.tsx src/components/CampaignOfferCard.test.tsx`

Expected: FAIL because `Browse` still reads and filters the first voucher page.

- [ ] **Step 5: Implement URL/query composition**

Use `useSearchParams` as the URL source of truth:

```ts
const [searchParams, setSearchParams] = useSearchParams();
const filters = parseOfferFilters(searchParams);
const query = useOffersQuery(filters);
const offers = flattenOfferPages(query.data?.pages ?? []);
const total = query.data?.pages[0]?.total ?? 0;

const updateFilters = (next: OfferFilters, options: { replace: boolean }) => {
  setSearchParams(writeOfferFilters(searchParams, next), { replace: options.replace });
};
```

Do not call `useVouchers()` for discovery or perform local search/status filtering.

- [ ] **Step 6: Implement mixed cards and persistent selection**

Keep selection above the mapped grid:

```ts
const [selected, setSelected] = useState<{
  offer: CampaignOffer;
  trigger: HTMLButtonElement;
} | null>(null);
const [dialogOpen, setDialogOpen] = useState(false);

const openCampaign: OpenCampaignOffer = (offer, trigger) => {
  setSelected({ offer, trigger });
  setDialogOpen(true);
};
```

Render community offers through `VoucherCard` with an `onRedeemSuccess` offer invalidation callback. Render campaign triggers in the grid, then render one `CampaignOfferDialog` after the grid from `selected`, not inside `.map()`.

- [ ] **Step 7: Implement exact page states and load more**

Use copy from the approved spec:

```tsx
{query.isPending && <p>loading...</p>}
{query.isError && !query.data && <Button onClick={() => query.refetch()}>retry loading offers</Button>}
{!query.isPending && total === 0 && !hasActiveOfferFilters(filters) && <p>no offers are available right now</p>}
{!query.isPending && total === 0 && hasActiveOfferFilters(filters) && <p>no offers match these filters</p>}
{query.isFetchNextPageError && (
  <Button onClick={() => query.fetchNextPage()}>retry loading more offers</Button>
)}
{query.hasNextPage && !query.isFetchNextPageError && (
  <Button onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>
    {query.isFetchingNextPage ? 'loading more...' : 'load more offers'}
  </Button>
)}
```

- [ ] **Step 8: Run focused tests and verify GREEN**

Run: `npm test -- src/pages/Browse.test.tsx src/components/OfferFilters.test.tsx src/components/CampaignOfferCard.test.tsx src/components/VoucherCard.test.tsx`

Expected: PASS for URL restoration, complete query composition, page states, mixed cards, and persistent claim success.

- [ ] **Step 9: Commit the new browse path**

```bash
git add src/pages/Browse.tsx src/pages/Browse.test.tsx
git commit -m "feat: browse the complete offer catalog"
```

---

## Task 12: Availability Invalidation And Viewer Cache Safety

**Files:**
- Modify: `src/hooks/useVoucherOperations.ts`
- Create: `src/hooks/useVoucherOperations.test.ts`
- Modify: `src/hooks/useBusinessQueries.ts`
- Modify: `src/hooks/useBusinessQueries.test.ts`
- Modify: `src/contexts/AuthContext.tsx`
- Create: `src/contexts/AuthContext.test.tsx`
- Modify: `src/hooks/useOffersQuery.test.ts`

**Interfaces:**
- Consumes: `offersQueryKey`, `vouchersQueryKey`, business query keys, existing auth service methods.
- Produces: offer invalidation after every availability mutation and removal of viewer-dependent offer/private voucher caches on login, signup, logout, initialization, and `auth:401`.

- [ ] **Step 1: Write failing community and settlement invalidation tests**

Create `src/hooks/useVoucherOperations.test.ts` and extend `useBusinessQueries.test.ts`:

```ts
const serviceMocks = vi.hoisted(() => ({
  donate: vi.fn(),
  redeem: vi.fn(),
  report: vi.fn(),
}));
vi.mock('@/services/voucher.service', () => ({ voucherService: serviceMocks }));
vi.mock('@/utils/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

let queryClient: QueryClient;
let invalidateQueries: ReturnType<typeof vi.spyOn>;
let wrapper: ({ children }: PropsWithChildren) => ReactElement;
const setMutationError = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
  wrapper = ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children);
  serviceMocks.donate.mockResolvedValue({ voucher: { id: 'voucher-1' } });
  serviceMocks.redeem.mockResolvedValue({ voucher: { id: 'voucher-1', isRedeemed: true } });
  serviceMocks.report.mockResolvedValue({ voucher: { id: 'voucher-1', isActive: false } });
});

const voucherInput = {
  platform: 'Google Pay' as const,
  title: 'Community reward',
  description: 'Shared reward',
  code: 'SAVE10',
  imageUrl: 'https://example.com/voucher.png',
  donatedBy: 'customer-1',
  isRedeemed: false,
};

it.each(['donate', 'redeem', 'report'] as const)('invalidates offers after %s success', async (operation) => {
  const { result } = renderHook(() => useVoucherOperations(setMutationError), { wrapper });
  const invoke = {
    donate: () => result.current.donateVoucher(voucherInput),
    redeem: () => result.current.redeemVoucher('voucher-1'),
    report: () => result.current.reportVoucher('voucher-1'),
  };
  await act(async () => invoke[operation]());

  expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: offersQueryKey });
});
```

In the existing `useRecordSettlementMutation` test, rename the case to `invalidates campaign, invoice, voucher, and offer queries after settlement`, add `expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: offersQueryKey })`, and change the total call assertion from four to five. Reuse its existing `invoice`, `campaign`, service mock, `QueryClient`, and mutation input rather than creating a second settlement harness.

- [ ] **Step 2: Write failing auth cache tests**

Create `src/contexts/AuthContext.test.tsx` with mocked auth services and a real QueryClient:

```ts
const authenticatedUser: User = {
  id: 'customer-1',
  email: 'customer@example.com',
  username: 'customer',
  role: 'customer',
  createdAt: new Date('2026-08-23T00:00:00.000Z'),
  redeemedVouchers: [],
};
const privateOfferPage = { offers: [], total: 0, nextCursor: null, hasMore: false };
const voucherWithCode = { id: 'voucher-1', code: 'PRIVATE-CODE' };
let auth!: AuthContextType;

const Probe = () => {
  auth = useAuth();
  return null;
};

const renderAuth = () => render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider><Probe /></AuthProvider>
  </QueryClientProvider>,
);

const performTransition = async (transition: 'login' | 'signup' | 'logout' | 'auth:401') => {
  await waitFor(() => expect(auth.isLoading).toBe(false));
  if (transition === 'login') {
    await act(async () => auth.login('customer@example.com', 'password123'));
  } else if (transition === 'signup') {
    await act(async () => auth.signup({
      role: 'customer',
      email: 'customer@example.com',
      username: 'customer',
      password: 'password123',
    }));
  } else if (transition === 'logout') {
    await act(async () => auth.logout());
  } else {
    act(() => window.dispatchEvent(new CustomEvent('auth:401')));
  }
};

it.each(['login', 'signup', 'logout', 'auth:401'])(
  'clears viewer-dependent queries after %s',
  async (transition) => {
    if (transition === 'logout' || transition === 'auth:401') {
      getCurrentUser.mockResolvedValueOnce({ user: authenticatedUser });
    }
    renderAuth();
    await waitFor(() => expect(auth.isLoading).toBe(false));
    queryClient.setQueryData(['offers', 'previous-user'], privateOfferPage);
    queryClient.setQueryData(vouchersQueryKey, [voucherWithCode]);

    await performTransition(transition);

    expect(queryClient.getQueriesData({ queryKey: offersQueryKey })).toEqual([]);
    expect(queryClient.getQueryData(vouchersQueryKey)).toBeUndefined();
  },
);

it('clears anonymous cache when startup resolves an authenticated viewer', async () => {
  getCurrentUser.mockResolvedValueOnce({ user: authenticatedUser });
  queryClient.setQueryData(['offers', 'anonymous'], privateOfferPage);
  renderAuth();

  await waitFor(() => expect(auth.user).toEqual(authenticatedUser));
  expect(queryClient.getQueriesData({ queryKey: offersQueryKey })).toEqual([]);
});
```

In test setup, make `getCurrentUser` resolve `{ user: null }`, `signInWithEmail` and `signUpWithEmail` resolve the authenticated user, and `signOut` resolve `{ success: true }`. The final test overrides startup with an authenticated viewer.

- [ ] **Step 3: Run focused tests and verify RED**

Run: `npm test -- src/hooks/useVoucherOperations.test.ts src/hooks/useBusinessQueries.test.ts src/contexts/AuthContext.test.tsx src/hooks/useOffersQuery.test.ts`

Expected: FAIL because current mutations know only voucher/business keys and AuthContext does not access QueryClient.

- [ ] **Step 4: Invalidate offers after availability mutations**

Import `offersQueryKey` in both hook modules. Add this call to successful donate, redeem, and report mutations:

```ts
queryClient.invalidateQueries({ queryKey: offersQueryKey });
```

Add it to the settlement `Promise.all` beside campaign, invoice, and voucher invalidation. Campaign claims already invalidate both offer and voucher keys from Task 8.

- [ ] **Step 5: Clear identity-bound caches in AuthContext**

Because `AuthProvider` is already inside `QueryClientProvider`, use `useQueryClient()`:

```ts
const clearViewerQueries = useCallback(() => {
  queryClient.removeQueries({ queryKey: offersQueryKey });
  queryClient.removeQueries({ queryKey: vouchersQueryKey });
}, [queryClient]);
```

Declare `queryClient` and `clearViewerQueries` before the initialization effect, add `clearViewerQueries` to that effect's dependency list, and call it immediately before setting a resolved login/signup/current user. Call it immediately after clearing the user on logout or `auth:401`, including when remote logout reports failure. This prevents a new viewer from inheriting excluded campaign totals or a claimed code cached for the prior viewer.

- [ ] **Step 6: Run the frontend milestone gate**

Run:

```bash
npm test -- src/services/offer.service.test.ts src/hooks/useOffersQuery.test.ts src/lib/offer-filters.test.ts src/components/OfferFilters.test.tsx src/components/CampaignOfferCard.test.tsx src/components/AuthHandoff.test.tsx src/pages/Browse.test.tsx src/hooks/useVoucherOperations.test.ts src/hooks/useBusinessQueries.test.ts src/contexts/AuthContext.test.tsx
npm test
npm run type-check
npm run lint
npm run build:production
```

Expected: all tests/type-check/build pass; lint has zero errors and no new warning beyond baseline.

- [ ] **Step 7: Commit invalidation and cache safety**

```bash
git add src/hooks/useVoucherOperations.ts src/hooks/useVoucherOperations.test.ts src/hooks/useBusinessQueries.ts src/hooks/useBusinessQueries.test.ts src/contexts/AuthContext.tsx src/contexts/AuthContext.test.tsx src/hooks/useOffersQuery.test.ts
git commit -m "fix: refresh offers across viewer and inventory changes"
```

---

## Task 13: Demo Schema, Product Truth, And API Documentation

**Files:**
- Modify: `scripts/seed-demo.mjs`
- Modify: `scripts/seed-demo.test.ts`
- Modify: `README.md`
- Modify: `PRODUCT.md`
- Modify: `CHANGELOG.md`
- Modify: `DEMO_DEPLOYMENT.md`

**Interfaces:**
- Consumes: final list/claim/view endpoints, compound runtime indexes, active campaign fixtures with multiple codes and a prior claim.
- Produces: runtime-equivalent demo indexes, deterministic grouped-offer evidence, and truthful end-user/developer documentation.

- [ ] **Step 1: Write failing demo grouping/index tests**

Extend `scripts/seed-demo.test.ts`:

```ts
it('provides one active grouped campaign with multiple remaining codes', () => {
  const fixtures = buildDemoFixtures(fixedNow);
  const active = fixtures.campaigns.find((campaign) => campaign.status === 'active');
  const inventory = fixtures.vouchers.filter((voucher) => voucher.campaignKey === active?.seedKey);

  expect(inventory.filter((voucher) => !voucher.isRedeemed)).toHaveLength(2);
  expect(inventory.filter((voucher) => voucher.isRedeemed)).toHaveLength(1);
  expect(new Set(inventory.map((voucher) => voucher.redeemedByKey).filter(Boolean)).size).toBe(1);
});
```

Add source-contract assertions that the duplicate `Campaign`, `Voucher`, and `RedeemedVoucher` schemas contain the exact Task 1 and Task 3 compound indexes.

- [ ] **Step 2: Run focused demo and deployment tests and verify RED**

Run: `npm test -- scripts/seed-demo.test.ts api/deployment.test.ts`

Expected: FAIL until duplicate offer indexes and new API/documentation statements are present.

- [ ] **Step 3: Mirror runtime indexes in the seed schema**

Add these exact duplicate indexes in `scripts/seed-demo.mjs`:

```js
campaignSchema.index({ status: 1, expiryDate: 1, _id: 1 });
voucherSchema.index({ sourceType: 1, isActive: 1, isRedeemed: 1, expiryDate: 1, _id: 1 });
voucherSchema.index({ campaignId: 1, sourceType: 1, isActive: 1, isRedeemed: 1, expiryDate: 1, _id: 1 });
voucherSchema.index({ campaignId: 1, redeemedBy: 1 });
```

Keep the active fixture as one campaign with one prior claim and two remaining codes. Do not print credentials or execute the seed in automated tests.

- [ ] **Step 4: Update product and API truth**

Document all of the following without claiming production scale or verified redemption:

```text
GET  /api/offers
POST /api/offers/campaign/:campaignId/claim
POST /api/offers/campaign/:campaignId/view
POST /api/vouchers/:id/redeem  (community vouchers only)
```

Update the customer flow to server-side search, core filters, expiry-first grouped campaign offers, and one campaign code per customer. Update the business value to coherent campaign discoverability and remaining-inventory display. Add the change under `CHANGELOG.md` Unreleased.

- [ ] **Step 5: Run documentation and focused tests and verify GREEN**

Run:

```bash
npm test -- scripts/seed-demo.test.ts api/deployment.test.ts
git diff --check
```

Expected: PASS with no stale endpoint, duplicate-card, or unlimited-campaign-claim claims.

- [ ] **Step 6: Commit demo and documentation**

```bash
git add scripts/seed-demo.mjs scripts/seed-demo.test.ts README.md PRODUCT.md CHANGELOG.md DEMO_DEPLOYMENT.md
git commit -m "docs: explain smart offer discovery"
```

---

## Task 14: Final Spec Review And Complete Verification Gate

**Files:**
- Review: all files changed since `e65467a`
- Modify: only files required to fix a verified in-scope failure

**Interfaces:**
- Consumes: all prior task commits and the approved spec.
- Produces: verified end-to-end feature evidence with no missing acceptance criterion.

- [ ] **Step 1: Review the complete diff against the spec**

Run:

```bash
git status --short
git diff --check e65467a..HEAD
git diff --stat e65467a..HEAD
git log --oneline e65467a..HEAD
```

Then verify each acceptance criterion explicitly:

```text
[ ] Complete catalog is queried on the server.
[ ] Community vouchers appear once and campaigns appear once.
[ ] Remaining counts include only active, unredeemed, unexpired inventory.
[ ] Results are available-only and expiry-first.
[ ] Search/filter URLs restore correctly.
[ ] One customer campaign claim survives concurrent requests.
[ ] Only the winning claimant receives a code.
[ ] Personal history, campaign analytics, settlement, and community claims still work.
```

- [ ] **Step 2: Run all focused feature suites**

Run:

```bash
npm test -- server/models/model.test.ts scripts/seed-demo.test.ts server/lib/offer-cursor.test.ts server/lib/offer-query.test.ts server/lib/offer-serializer.test.ts server/routes/offers.test.ts server/routes/vouchers.test.ts server/lib/transaction.test.ts server/lib/campaign-analytics.test.ts server/app.test.ts src/services/offer.service.test.ts src/hooks/useOffersQuery.test.ts src/lib/offer-filters.test.ts src/components/OfferFilters.test.tsx src/components/CampaignOfferCard.test.tsx src/components/AuthHandoff.test.tsx src/components/VoucherCard.test.tsx src/pages/Browse.test.tsx src/hooks/useVoucherOperations.test.ts src/hooks/useBusinessQueries.test.ts src/contexts/AuthContext.test.tsx api/deployment.test.ts
```

Expected: every focused test passes with zero failures.

- [ ] **Step 3: Run the complete repository gate**

Run:

```bash
npm test
npm run type-check
npm run lint
npm run build:production
```

Expected: full tests, type-check, and production build pass; lint reports zero errors and no new warnings beyond the baseline recorded in Task 1.

- [ ] **Step 4: Check container availability without installing anything**

Run: `docker version`

Expected: if Docker is unavailable in WSL, record that environmental limitation. If available, run `docker build -t vouchit-smart-offers .` as an additional static-frontend packaging check; do not claim it verifies the Express API.

- [ ] **Step 5: Review privacy and concurrency evidence**

Confirm from test output and diff:

```text
[ ] No public offer serializer spreads raw documents.
[ ] No offer response/search contains voucher codes or inventory IDs.
[ ] Direct campaign inventory redemption is blocked.
[ ] Duplicate customer-campaign claims map to 409 and roll back inventory.
[ ] Concurrency evidence includes schema index metadata, real `withTransaction` session delegation, and overlapping request-local rollback simulation; no live database test is claimed.
[ ] Claimed-code dialog remains mounted after offer invalidation.
[ ] Login/logout/401 cannot reuse prior viewer offer or private voucher caches.
```

- [ ] **Step 6: Commit only verified correction work, if any**

If Steps 1-5 require fixes, rerun the affected focused suite plus the complete gate, then commit only those files:

```bash
git add <verified-fix-files>
git commit -m "fix: close smart offer discovery verification gaps"
```

If no fixes are required, do not create an empty commit.

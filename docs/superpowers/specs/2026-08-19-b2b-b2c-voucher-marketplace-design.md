# B2B/B2C Voucher Marketplace Design

## Goal

Extend VouchIt from a customer-to-customer voucher exchange into a B2B/B2C marketplace prototype. Businesses should be able to distribute excess promotional voucher inventory for a service fee, while customers continue to discover, donate, and claim vouchers from Google Pay, Paytm, PhonePe, and other supported platforms.

The implementation must truthfully support these portfolio claims:

- VouchIt is a B2B/B2C voucher marketplace prototype with separate customer and business workflows.
- Businesses can upload promotional voucher inventory, receive an invoice for a service fee, record an external payment, and publish the inventory.
- Customers can discover, donate, and exchange vouchers through the existing donate-and-claim model.
- Business dashboards report observed voucher views, claims before expiry, remaining inventory, expired inventory, claim rate, and fee per claim.

The product must not imply that VouchIt processes payments, verifies businesses, measures unique people, proves production-scale impact, or supports direct voucher-for-voucher swaps.

## Users And Permissions

### Customers

Customers can:

- Browse public vouchers without signing in.
- Donate community vouchers after signing in.
- Claim available vouchers after signing in.
- Use existing favorites, comments, reports, requests, notifications, and account activity.

Customers cannot create campaigns, issue invoices, record business payments, or view business analytics.

### Businesses

Businesses can:

- Browse public vouchers.
- Create and inspect their own campaigns.
- Import campaign inventory by CSV.
- Issue and inspect invoices for their own campaigns.
- Record an external payment against their own invoice.
- View their own campaign inventory outcomes and observed analytics.

Businesses cannot perform customer marketplace mutations, including donation, claiming, favorites, comments, and reports. They also cannot access another business's campaigns, invoices, or analytics.

### Existing Accounts

New signup requires an immutable `customer` or `business` role. Existing persisted users without a role resolve to `customer`; this is required because deployed and seeded account data predates role support. There is no role-switching or customer-to-business upgrade flow in this scope.

## Architecture

Extend the existing voucher pipeline rather than creating a parallel public inventory system.

- Add business profiles, campaigns, and invoices as focused domain models.
- Store every accepted campaign code as an inactive record in the existing voucher collection.
- Tag vouchers with `sourceType: community | campaign` and an optional campaign reference.
- Reuse existing voucher listing, code privacy, reporting, and atomic claim behavior.
- Activate campaign vouchers only when the associated invoice is settled.
- Derive campaign analytics from voucher records instead of maintaining duplicate campaign counters.

This preserves the working B2C path and gives the B2B path clear boundaries. It avoids inventory-to-listing synchronization and does not require a broad listing-system rewrite.

## Data Model

### User

Add:

- `role`: `customer | business`, required for new users.

Authentication responses expose the resolved role. Server authorization uses the resolved role and treats a missing persisted role as `customer`.

### BusinessProfile

Fields:

- `userId`: unique business-user reference.
- `organizationName`: required.
- `contactName`: required.
- `website`: optional HTTPS URL.
- Standard creation and update timestamps.

A business profile belongs to exactly one business user. Customer users cannot own one.

### Campaign

Fields:

- `businessId`: owning business user.
- `businessProfileId`: owning organization profile.
- `title`: customer-facing offer title.
- `brandName`: merchant or campaign brand.
- `description`: customer-facing offer description.
- `terms`: redemption conditions.
- `platform`: Google Pay, Paytm, PhonePe, or Other.
- `category`: existing voucher category.
- `imageUrl`: shared campaign image.
- `expiryDate`: common voucher expiry.
- `status`: `draft | awaiting_payment | active | completed`.
- `lockedAt`: set when the invoice is issued.
- Standard creation and update timestamps.

Only draft campaigns are editable. The final successful claim persists `completed`. If expiry passes first, API responses derive an effective `completed` state with reason `expired`; public queries independently enforce voucher expiry, so no scheduled mutation is required and stale stored state cannot expose expired inventory.

### Voucher

Add:

- `sourceType`: `community | campaign`; existing records resolve to `community`.
- `campaignId`: required only for campaign vouchers.
- `viewCount`: non-negative integer, default `0`.

Campaign vouchers retain `donatedBy` as the owning business user so existing owner code access remains available. They reuse campaign details for public presentation through the campaign reference. A partial unique index prevents duplicate codes within one campaign without incorrectly treating identical codes from different brands or campaigns as duplicates.

### Invoice

Fields:

- `campaignId`: unique campaign reference.
- `businessId`: owning business user.
- `priceVersion`: `v1`.
- `currency`: `INR`.
- `baseFeePaise`: `9900`.
- `perVoucherFeePaise`: `200`.
- `quantity`: accepted campaign voucher count.
- `totalPaise`: `baseFeePaise + perVoucherFeePaise * quantity`.
- `status`: `issued | paid`.
- `issuedAt`: immutable issue timestamp.
- `paidAt`: optional audit timestamp.
- `externalPaymentReference`: optional until paid.
- `externalPaymentDate`: optional until paid.
- Standard creation and update timestamps.

All money uses integer paise. Invoice pricing is an immutable snapshot; later claims cannot change the amount. External payment references are unique per business.

## Campaign Lifecycle

### 1. Business Signup

Signup requires the common email, username, and password fields plus a role. Business signup also requires organization and contact names and accepts an optional website. User and business-profile creation succeed or fail together.

Login remains shared. Customers enter the customer dashboard; businesses enter `/business`.

### 2. Campaign Draft

A business creates shared campaign details. Drafts and their voucher inventory are private. Ownership checks apply to every campaign operation.

### 3. CSV Preview And Confirmation

The browser parses CSV using Papa Parse rather than hand-written CSV tokenization. The accepted format is:

```csv
code,value
WELCOME50,₹50
SHIPFREE,
```

Rules:

- `code` is required; `value` is optional.
- Imports are limited to 500 data rows.
- Codes are trimmed and validated against the existing 200-character limit.
- The header must be exactly `code` or `code,value`; unsupported or duplicate headers fail the entire preview.
- Malformed CSV fails the entire preview.
- Blank codes, oversized fields, and duplicate campaign codes reject their individual rows.
- Confirmation requires at least one accepted row.
- Preview identifies every rejected row by source row number and reason.
- No voucher records are created during preview.
- Confirmation revalidates server-side and transactionally replaces the current draft inventory with the accepted rows.
- Confirmation is all-or-nothing; no partial inventory is persisted.

The browser parser improves preview quality, but the API remains the validation authority.

### 4. Quote And Invoice

The quote is calculated server-side as:

```text
₹99 base fee + ₹2 × accepted voucher quantity
```

The campaign workspace displays the formula before invoice issuance. Issuance requires at least one accepted voucher, creates at most one invoice, locks campaign details and inventory, and changes the campaign to `awaiting_payment`. A repeated issue request returns the existing invoice.

### 5. External Payment Record And Publication

The business records:

- The exact invoice amount.
- A non-empty external payment reference.
- The external payment date.

VouchIt records but does not process or verify the external payment. A successful settlement transaction:

1. Marks the invoice `paid` and stores audit metadata.
2. Changes the campaign to `active`.
3. Activates every campaign voucher.

Amount mismatch, duplicate references, repeated conflicting settlement, invalid dates, and wrong ownership fail without publishing inventory. Repeating the same successful settlement is idempotent. A transaction failure leaves the invoice issued, campaign awaiting payment, and all inventory private.

### 6. Public Discovery And Claim

Paid campaign vouchers appear in the existing browse flow. Public availability excludes vouchers that are unpaid, inactive, redeemed, reported out, or expired.

Campaign vouchers add restrained source information:

- `business campaign` label.
- Organization or brand name.

They otherwise use the existing card and details behavior. Codes remain hidden from anonymous users, unrelated customers, and unrelated businesses. The owning business and the customer who claims a voucher can view its code.

Only customers can claim. The atomic claim predicate checks role, active status, redemption status, donor mismatch, and expiry. The final inventory claim completes the campaign.

### 7. Views And Outcomes

Opening an active campaign voucher's details records one aggregate view. Tracking is best-effort and cannot block the detail experience. Views are total detail opens, not unique people, verified impressions, or ad reach.

Campaign analytics derive:

- `totalInventory`: all accepted campaign vouchers.
- `views`: sum of campaign voucher detail views.
- `claimedBeforeExpiry`: vouchers claimed before their expiry.
- `remaining`: active, unclaimed, unexpired vouchers.
- `expired`: unclaimed, non-deactivated vouchers past expiry.
- `deactivated`: unclaimed vouchers removed by existing reporting rules, regardless of later expiry.
- `claimRate`: `claimedBeforeExpiry / totalInventory`.
- `feePerClaim`: paid invoice total divided by `claimedBeforeExpiry`.

The outcome buckets are mutually exclusive and reconcile to total inventory in this order: claimed, deactivated, expired, then remaining. When there are no claims, fee per claim displays as unavailable rather than infinity or zero. Product language may call `claimedBeforeExpiry` rescued inventory or reduced wastage, but must not claim a causal result beyond the observed transfer. Product language may call recorded detail views campaign reach only when it clearly identifies them as aggregate voucher views.

## API Boundaries

Existing authentication and voucher routes gain role-aware validation. New business behavior lives behind a dedicated router.

Representative operations:

- `POST /api/auth/signup`: accept role and conditional business fields.
- `GET /api/business/campaigns`: list the current business's campaigns and summaries.
- `POST /api/business/campaigns`: create a draft campaign.
- `GET /api/business/campaigns/:id`: return owned campaign, inventory outcome, invoice, and analytics.
- `PATCH /api/business/campaigns/:id`: update an owned draft.
- `POST /api/business/campaigns/:id/inventory/preview`: validate normalized CSV rows without persistence.
- `PUT /api/business/campaigns/:id/inventory`: revalidate and replace owned draft inventory.
- `POST /api/business/campaigns/:id/invoice`: idempotently issue the invoice and lock the campaign.
- `GET /api/business/invoices`: list the current business's invoices.
- `POST /api/business/invoices/:id/settlement`: record external payment and activate the campaign.
- `POST /api/vouchers/:id/view`: increment aggregate views for an active campaign voucher.

Unauthenticated protected operations return `401`. Authenticated wrong-role and wrong-owner operations return `403`. Missing records return `404`. Invalid state transitions and stale availability return `409`. Input validation returns `400` with safe, field- or row-specific details.

## Product Surfaces

### Authentication

The signup view adds an accessible customer/business selector. Business selection reveals organization, contact, and website fields. Login UI remains shared. Role-specific redirects occur after authentication.

### Navigation

Public Browse, About, Community, and `/for-businesses` remain available to all visitors.

Customer navigation retains Donate and Dashboard. Business navigation replaces customer mutations with Campaigns and Invoices. Hidden navigation never substitutes for server authorization.

### For Businesses

`/for-businesses` is a public, factual explanation of campaign distribution, CSV inventory, service-fee pricing, recorded external settlement, and observed analytics. Its CTA opens business signup. It must identify the capability as a prototype and must not imply business verification, online checkout, guaranteed reach, or production customers.

### Business Dashboard

`/business` shows:

- Campaign status counts.
- Observed aggregate views and claimed-before-expiry inventory.
- Recent campaigns.
- Recent invoices and outstanding amounts.
- A clear new-campaign action.

### Campaign Workspace

`/business/campaigns/new` uses four ordered stages:

1. Campaign details.
2. CSV inventory preview and confirmation.
3. Quote and invoice issuance.
4. External settlement and activation.

`/business/campaigns/:id` shows the current stage, immutable invoice data once issued, inventory outcomes, and analytics. Locked stages remain readable but not editable.

### Marketplace

Existing community voucher cards remain visually unchanged. Campaign cards and details add only source and organization attribution. Business inventory must not create sale bursts, promotional ribbons, ad density, fabricated urgency, or a separate visual catalog.

### Landing And About

Add a discoverable For Businesses path and describe the marketplace as supporting community donations plus business campaign inventory. Remove the contradictory `no monetization` claim. Copy must distinguish the service-fee invoice ledger from payment processing and observed product metrics from production impact.

## Visual And Accessibility Rules

- Preserve the documented Community Noticeboard system.
- Continue using Claim Green for positive action and Expiry Amber only for real expiry pressure.
- Prefer hairline borders, tonal surfaces, compact typography, modest corners, and minimal elevation.
- Keep customer-provided and business-provided content casing intact; interface labels may retain VouchIt's lowercase voice.
- Make the campaign stages understandable without color alone.
- Associate CSV errors with source row numbers and provide a summary for assistive technology.
- Keep standalone controls at least 44px where the existing system requires it.
- Maintain keyboard operation, visible focus, semantic labels, logical focus order, and light/dark theme support.
- Ensure tables and invoice details reflow without horizontal page overflow on mobile.
- Avoid decorative analytics charts when direct values and a simple observed funnel communicate the data more clearly.

## Failure Handling And Invariants

- A business can read and mutate only its own campaigns and invoices.
- Customer and business mutation permissions are enforced server-side.
- Campaign details and inventory cannot change after invoice issuance.
- One campaign has at most one invoice.
- Invoice amounts use integer paise and cannot change after issuance.
- A campaign voucher cannot become public before invoice settlement.
- Settlement and campaign activation succeed or roll back together.
- Confirmed CSV inventory is persisted entirely or not at all.
- Public queries and claim predicates enforce expiry even when no scheduler runs.
- Claims remain single-winner under concurrent requests.
- View tracking failures do not prevent viewing or claiming.
- Analytics do not divide by zero or fabricate unavailable values.
- API responses never expose voucher codes beyond the owning business and claiming customer.
- Recoverable errors preserve the current campaign stage and entered non-sensitive data where practical.

## Delivery Sequence

Implement one complete feature slice at a time.

### Feature 1: Roles And Business Identity

- User roles and persisted-account customer fallback.
- Business profile creation during signup.
- Server authorization helpers.
- Role-aware authentication responses, redirects, navigation, and business shell.

### Feature 2: Campaigns And CSV Inventory

- Campaign model and owned draft APIs.
- Papa Parse CSV upload and preview.
- Server row validation and transactionally confirmed inventory.
- Campaign details and inventory workspace stages.

### Feature 3: Pricing, Invoices, And Activation

- Versioned ₹99 + ₹2 quote calculation.
- Immutable invoice issuance.
- External settlement recording and idempotency.
- Transactional invoice payment, campaign activation, and voucher publication.

### Feature 4: Customer Marketplace Integration

- Campaign voucher source attribution.
- Public paid/active/unredeemed/unexpired filtering.
- Customer-only atomic claims and code privacy.
- Existing reporting, search, detail, and expiry behavior preserved.

### Feature 5: Analytics And Business Dashboard

- Best-effort aggregate view tracking.
- Campaign outcome aggregation.
- Business campaign details, observed funnel, and invoice history.
- Zero-state and expired-inventory handling.

### Feature 6: Positioning And Demo Readiness

- Public For Businesses surface.
- Landing and About copy alignment.
- Seeded business, campaign, paid invoice, inventory, views, and claim outcomes.
- README and recruiter demo-flow documentation.
- Final cross-feature regression verification.

Do not begin the next feature until the current feature meets its automated verification gate.

## Testing And Verification

### Focused Coverage

Feature tests must cover:

- Customer and business signup, legacy role fallback, redirects, and wrong-role rejection.
- Campaign ownership, draft editing, locking, and invalid transitions.
- CSV quoting, malformed rows, unsupported headers, duplicates, limits, preview reasons, and all-or-nothing confirmation.
- Integer pricing, idempotent invoice issuance, immutable snapshots, settlement validation, rollback, and activation.
- Public visibility before and after settlement, expiry filtering, code privacy, concurrent claims, and final-claim completion.
- View tracking failure isolation and analytics for zero, active, claimed, expired, and deactivated inventory.
- Role-aware navigation, campaign stages, invoice details, settlement form, marketplace attribution, dashboard states, and truthful copy.

### Per-Feature Gate

After each feature, run:

1. Focused tests for the feature.
2. `npm test`.
3. `npm run type-check`.
4. `npm run lint`.
5. `npm run build`.

Do not continue with an in-scope failure. Pre-existing warnings may remain only when they are unchanged and explicitly documented. Per-feature browser walkthroughs are not required by the approved verification bar.

## Scope Boundaries

Included:

- Strict customer and business roles.
- Business signup profile fields.
- Campaign drafts and up-to-500-row CSV inventory.
- Versioned fixed-plus-inventory pricing.
- Internal invoice ledger and externally recorded settlement.
- Settlement-gated campaign publication.
- Campaign voucher discovery and customer claiming.
- Aggregate views and observed outcome analytics.
- Business dashboard, invoices, For Businesses, and factual positioning.
- Seeded recruiter demonstration data and documentation.

Excluded:

- Stripe, Razorpay, or any online payment processor.
- Payment verification, refunds, credits, taxes, subscriptions, or accounting exports.
- Admin review, business verification, campaign moderation, or role upgrades.
- Campaign changes after invoice issuance.
- Direct voucher-for-voucher swaps, offers, matching, or escrow.
- Dynamic pricing, discount tiers, projected reach, unique-person analytics, or attribution modeling.
- Claims of production customers, guaranteed validity, causal marketing lift, or measured real-world wastage reduction.

## Acceptance Criteria

- A new customer account can donate and claim but cannot access business mutations.
- A new business account can create a private draft campaign but cannot donate or claim.
- A business can preview a valid CSV, understand rejected rows, and atomically confirm up to 500 accepted codes.
- The server calculates and snapshots an invoice as ₹99 plus ₹2 per accepted voucher.
- Campaign details and inventory lock when the invoice is issued.
- Recording an exact external settlement pays the invoice and publishes all campaign vouchers atomically.
- Unpaid, inactive, redeemed, reported-out, and expired campaign vouchers never appear as available public inventory.
- Customers can discover and atomically claim campaign vouchers without exposing codes to unauthorized viewers.
- The business dashboard reports aggregate detail views, claimed-before-expiry, remaining, expired, claim rate, and fee per claim without projections or invalid zero-division values.
- Public product copy accurately describes the B2B/B2C prototype and removes contradictory no-monetization language.
- The UI remains responsive, keyboard-operable, theme-compatible, and consistent with the Community Noticeboard system.
- Every feature passes focused tests, the full test suite, type-check, lint, and production build before work advances.

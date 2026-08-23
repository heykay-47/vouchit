# Smart Offer Discovery Design

**Date:** 2026-08-23
**Status:** Approved in conversation

## Summary

VouchIt will replace the current client-filtered browse list with a server-driven catalog of claimable offers. Community vouchers remain individual offers. Each active business campaign becomes one grouped offer with a remaining-inventory count, regardless of how many voucher codes it contains.

Customers can search and filter the complete available catalog instead of only the first 20 voucher rows. Businesses gain a coherent, searchable campaign presence rather than many duplicate-looking cards. A customer may claim at most one code from each campaign.

## Problem

`GET /api/vouchers` currently defaults to 20 rows, while `Browse` performs search and status filtering only over those loaded rows. Results can therefore omit valid matches and report misleading counts. The same endpoint also mixes public availability with authenticated donation and redemption history.

Campaign inventory is stored as one `Voucher` document per code. Public browsing consequently renders one nearly identical card per campaign code, allowing a large campaign to crowd out community vouchers and other campaigns.

## Goals

- Search all claimable community and campaign inventory on the server.
- Filter by platform, category, source, and a seven-day expiry window.
- Sort claimable offers by nearest expiry to reduce voucher waste.
- Represent each campaign once while showing its remaining inventory.
- Make filter state shareable and restorable through the URL.
- Enforce one campaign code per customer, including concurrent requests.
- Preserve voucher-code privacy until a claim succeeds.
- Keep personal voucher history separate from public discovery.

## Non-Goals

- Personalized recommendations or behavioral ranking.
- Atlas Search, fuzzy matching, synonyms, or typo correction.
- Structured monetary-value filtering; `value` remains free text.
- Curated collections or business-paid placement.
- Public redeemed or expired offer archives.
- Changes to campaign pricing, settlement, or analytics definitions.
- A synchronized marketplace-listing collection.

## Architecture

### Discovery Boundary

Add a dedicated `GET /api/offers` endpoint. `/api/offers` owns public discovery, while `/api/vouchers` continues to support voucher history and existing voucher operations.

The endpoint returns a discriminated union:

```ts
type Offer = CommunityOffer | CampaignOffer;

interface OfferPage {
  offers: Offer[];
  total: number;
  nextCursor: string | null;
  hasMore: boolean;
}
```

Both offer variants include `id`, `kind`, `title`, `description`, `platform`, `category`, `imageUrl`, `expiryDate`, and optional `value`. A community offer also carries the minimum existing voucher state required by `VoucherCard`. A campaign offer includes `brandName`, `organizationName`, `terms`, and `remainingCount`.

Discovery responses never include an unclaimed voucher code or an underlying campaign voucher ID. Campaign offer identity is the campaign ID.

### Query Contract

`GET /api/offers` accepts:

| Parameter | Values | Behavior |
| --- | --- | --- |
| `q` | Trimmed string, maximum 100 characters | Matches public title, description, platform, category, campaign brand, or organization |
| `platform` | Existing `VoucherPlatform` value | Exact platform match |
| `category` | Existing `VoucherCategory` value | Exact category match |
| `source` | `all`, `community`, or `campaign` | Restricts offer source; defaults to `all` |
| `expiringSoon` | `true` or `false` | When true, expiry must be after server time and no later than seven days from server time |
| `limit` | Integer from 1 through 48 | Defaults to 24 |
| `cursor` | Opaque cursor returned by the previous page | Continues after the prior page's stable expiry, kind, and ID tuple |

Invalid parameters return `400`. Search input is escaped before constructing case-insensitive matching and is never applied to voucher codes.

The query produces one normalized stream from:

- Active, unredeemed, unexpired community vouchers.
- Active, unexpired campaigns with at least one active, unredeemed, unexpired inventory voucher.

Campaign rows join their business profile for organization search and attribution, and aggregate only currently eligible inventory into `remainingCount`. Filters and search are applied to the normalized public fields. Results sort by expiry ascending, with no-expiry community offers last, then by kind and ID. The server encodes an opaque cursor from that tuple so removals between page requests cannot shift an offset and skip results. A faceted count returns the viewer-specific `total` in the same database operation as the page.

For signed-in customers, campaigns previously claimed by that customer are excluded because they are no longer actionable. Anonymous visitors and business viewers may still inspect all active offers. Personal redeemed and donated vouchers remain available through the customer dashboard rather than `/browse`.

### Claim Boundary

Add `POST /api/offers/campaign/:campaignId/claim`, restricted to the customer role.

The transaction will:

1. Verify that the campaign is active and unexpired.
2. Reject the request if any campaign voucher is already redeemed by this customer. This preserves the limit for historical claims created before this feature.
3. Atomically select the first eligible campaign voucher by stable ID and mark it redeemed by the customer.
4. Create the `RedeemedVoucher` history row with its `campaignId`.
5. Mark the campaign completed when no eligible inventory remains.
6. Commit and return the assigned voucher, including its code, to the claimant.

`RedeemedVoucher.campaignId` is optional for community and historical rows. A partial unique index on `(userId, campaignId)` applies when `campaignId` exists. Concurrent claims by the same customer may tentatively select separate inventory, but only one unique redemption can commit; the losing transaction rolls back its voucher update and returns `409`.

The existing `POST /api/vouchers/:id/redeem` route will accept only community vouchers, including legacy rows without `sourceType`. This prevents callers from bypassing the campaign claim invariant with a known inventory ID.

### View Analytics

Opening campaign offer details records one best-effort campaign-offer view. To preserve the implemented analytics definition, the endpoint increments `viewCount` on one eligible voucher in that campaign. Business analytics continue summing voucher view counts, so no historical analytics migration or second metric is introduced. Missing or newly unavailable offers produce a valid no-op response; view tracking never blocks browsing.

## Frontend Design

### URL And Query State

`Browse` reads and writes these URL parameters:

- `q`
- `platform`
- `category`
- `source`
- `expiring=true`

The search input maintains immediate local text and updates `q` after a short debounce. Filter changes update the URL immediately. Any search or filter change clears accumulated pages and restarts without a cursor. Browser back and forward navigation restore the corresponding query.

The offer hook uses React Query infinite pagination with 24 offers per page. The query key contains all normalized filters. The next request uses the server's opaque `nextCursor`, and the UI renders an accessible `load more offers` button only when `hasMore` is true.

### Components

- `Browse` composes URL state, query state, result count, and page-level states.
- `OfferFilters` owns the search field, platform/category/source controls, expiry toggle, and clear-filters action.
- Existing `VoucherCard` renders community offers and retains its current details and redemption flow.
- `CampaignOfferCard` renders grouped campaign attribution, remaining inventory, details, terms, role-aware actions, and claim success.

The new controls and campaign card retain the Community Noticeboard visual language: border-led surfaces, compact spacing, Claim Green actions, Expiry Amber urgency, lowercase interface copy, and no marketplace-style promotional chrome.

### Campaign Card And Claim Flow

The card displays:

- `business campaign` source label.
- Organization and brand.
- Campaign title, platform, category, and expiry.
- Exact remaining inventory count.
- Description and terms in the details dialog.

Anonymous visitors opening the claim action use the shared sign-in handoff. Business accounts can inspect the offer but see that claiming requires a customer account. Customer claims disable the action while pending.

On success, the dialog stays open and switches to an assigned-code state with a copy action. The code remains in local mutation state while offer and voucher-history queries refresh. The campaign then disappears from that customer's available results without removing the visible success state. Closing the dialog discards the local code because it is retrievable later from customer history.

Community claim success invalidates offer discovery through `VoucherCard.onRedeemSuccess`. Donation, report-based deactivation, campaign settlement, and campaign claims also invalidate the offer query because each can change availability.

### Loading, Empty, And Error States

- Initial loading displays the existing restrained loading treatment.
- Pagination keeps loaded offers visible while the next page is pending.
- A failed first page shows a retry action.
- A failed later page keeps prior pages and places retry feedback beside `load more`.
- No active inventory shows `no offers are available right now`.
- A filtered empty result shows `no offers match these filters` and a clear-filters action.
- A claim conflict refreshes discovery and explains that the campaign is already claimed or no longer available.

Result copy reports offers rather than voucher codes. Campaign `remainingCount` separately communicates inventory depth.

## Error And Privacy Rules

- `400`: malformed ID or invalid query parameter.
- `401`: unauthenticated campaign claim.
- `403`: authenticated non-customer campaign claim.
- `404`: unknown campaign ID.
- `409`: campaign expired, completed, sold out, already claimed by this customer, or lost concurrent claim.
- `500`: unexpected database or transaction failure; no code is returned and inventory changes roll back.

All claim-state conflicts use non-sensitive messages. Public offer serialization has an allowlist and cannot reuse owner-scoped business inventory serialization. Search does not inspect codes, and grouped responses do not reveal inventory document IDs, claimants, or business-owner user IDs.

## Testing

### Server

- Query-schema validation, bounded pagination, and invalid-cursor rejection.
- Search escaping and matching across community title/description and campaign title/description/brand/organization.
- Platform, category, source, and seven-day expiry filters individually and in combination.
- Expiry-first stable ordering, null-expiry placement, total counts, and cursor boundaries across inventory changes.
- Multiple eligible campaign vouchers produce one offer with the correct `remainingCount`.
- Inactive, completed, expired, sold-out, redeemed, reported, and unpaid inventory is excluded.
- Claimed campaigns are excluded only for the claiming customer.
- No discovery response contains a voucher code or campaign inventory ID.
- Customer claim success returns one assigned code and writes voucher and redemption state.
- Historical campaign claims enforce the new one-claim limit.
- Concurrent same-customer claims produce one success and one `409` without consuming two vouchers.
- Different customers can claim distinct codes from the same campaign.
- The final eligible claim completes the campaign.
- Direct voucher redemption cannot claim campaign inventory.
- Campaign view recording is best-effort and remains compatible with aggregate analytics.

### Frontend

- URL parameters initialize controls and query keys.
- Debounced search and immediate filters reset pagination.
- Loading, first-page error, later-page error, active-empty, and filtered-empty states.
- `load more` appends offers without duplicates and preserves loaded content while fetching.
- Community offers still use the established card behavior.
- Campaign cards expose source, attribution, remaining count, expiry, description, and terms in accessible names and content.
- Anonymous auth handoff, business role restriction, pending claim state, conflict refresh, assigned-code success, and copy action.
- Offer queries invalidate after every availability-changing mutation.

### Completion Gate

Run focused server and frontend tests, the full test suite, real TypeScript checks, ESLint, and the production build. Existing repository warnings may remain only if no new warning is introduced. No per-feature browser walkthrough is required by the established project verification preference.

## Documentation Impact

Update `README.md`, `PRODUCT.md`, `CHANGELOG.md`, and `DEMO_DEPLOYMENT.md` to describe grouped discovery, core filters, and one campaign claim per customer. Extend the API table with offer listing, campaign claiming, and campaign-offer view recording. Update demo fixtures only as needed to demonstrate multiple codes grouped into one campaign offer and a customer-specific prior claim.

## Acceptance Criteria

- Searching and filtering `/browse` queries the complete available catalog on the server.
- Community vouchers appear once each; campaigns appear once each regardless of inventory size.
- Every campaign offer reports only eligible remaining inventory.
- Results are available-only and expiry-first.
- Search/filter URLs can be shared and restored.
- A customer can claim exactly one code from a campaign, including under concurrent requests.
- Only a successful claimant receives the assigned code.
- Existing customer history, business analytics, campaign settlement, and community redemption remain functional.
- Automated verification gates pass before the feature is considered complete.

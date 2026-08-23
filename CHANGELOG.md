# Changelog

All notable changes to VouchIt are documented here.

## [Unreleased]

### Added

- Added server-side offer discovery for available community vouchers and eligible active campaigns with remaining claimable inventory, including search, core filters, expiry-first ordering, grouped inventory, remaining-code display, and one claim per customer per campaign.
- Added idempotent customer and business demo fixtures, including paid campaigns, settlement evidence, claimed and remaining inventory, observed views, and expired campaign history.
- Added truthful B2B/B2C product and deployment documentation with the role-aware recruiter flow and complete business API table.
- Added Papa Parse to the documented business inventory stack and documented integer-paise campaign pricing with recorded external/offline settlement.
- Added a Vercel-inspired Exchange Board landing page at `/` with public browsing CTA and authenticated donation handoff.
- Added animated donated, available, and claimed exchange states with reduced-motion support.
- Added the connected donate, discover, and claim walkthrough with responsive timeline progression.

### Fixed

- Stopped the demo seed from printing passwords and guarded database execution so fixture builders can be imported safely in tests.
- Updated the static Docker builder to Node 24 and clarified that Docker serves only the frontend while Vercel provides the end-to-end deployment.
- Moved voucher browsing to `/browse` while keeping the landing page at `/`.
- Fixed mobile Exchange Board rail, node, connector, and ticket overlap by reserving a right-side progression gutter.
- Fixed the desktop walkthrough connector crossing the donate, discover, and claim labels.
- Fixed 622px and mobile layout clipping caused by content-driven stage heights and fixed rail coordinates.
- Removed duplicate expiry wording from the claimed voucher state.
- Preserved readable explanatory-copy contrast during stage progression.
- Stabilized the voucher provider's empty-query fallback to prevent update-depth loops.

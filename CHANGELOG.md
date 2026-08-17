# Changelog

All notable changes to VouchIt are documented here.

## [Unreleased]

### Added

- Added a Vercel-inspired Exchange Board landing page at `/` with public browsing CTA and authenticated donation handoff.
- Added animated donated, available, and claimed exchange states with reduced-motion support.
- Added the connected donate, discover, and claim walkthrough with responsive timeline progression.

### Fixed

- Moved voucher browsing to `/browse` while keeping the landing page at `/`.
- Fixed mobile Exchange Board rail, node, connector, and ticket overlap by reserving a right-side progression gutter.
- Fixed the desktop walkthrough connector crossing the donate, discover, and claim labels.
- Fixed 622px and mobile layout clipping caused by content-driven stage heights and fixed rail coordinates.
- Removed duplicate expiry wording from the claimed voucher state.
- Preserved readable explanatory-copy contrast during stage progression.
- Stabilized the voucher provider's empty-query fallback to prevent update-depth loops.

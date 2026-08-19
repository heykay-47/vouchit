import { describe, expect, it } from 'vitest';
import { calculateCampaignAnalytics } from './campaign-analytics.js';

const expiryDate = new Date('2026-08-20T00:00:00.000Z');
const now = new Date('2026-08-19T00:00:00.000Z');

const voucher = (overrides: Record<string, unknown> = {}) => ({
  isRedeemed: false,
  redeemedAt: null,
  expiryDate,
  reportCount: 0,
  isActive: true,
  viewCount: 0,
  ...overrides,
});

describe('calculateCampaignAnalytics', () => {
  it('reconciles inventory, sums views, calculates claim rate, and rounds fee per claim', () => {
    const analytics = calculateCampaignAnalytics([
      voucher({ isRedeemed: true, redeemedAt: new Date('2026-08-18T12:00:00.000Z'), viewCount: 1 }),
      voucher({ isRedeemed: true, redeemedAt: new Date('2026-08-19T12:00:00.000Z'), viewCount: 2 }),
      voucher({ reportCount: 5, isActive: false, expiryDate: new Date('2026-08-18T00:00:00.000Z'), viewCount: 3 }),
      voucher({ expiryDate: new Date('2026-08-18T00:00:00.000Z'), viewCount: 4 }),
      voucher({ viewCount: 5 }),
    ], { status: 'paid', totalPaise: 10001 }, now);

    expect(analytics).toEqual({
      totalInventory: 5,
      views: 15,
      claimedBeforeExpiry: 2,
      deactivated: 1,
      expired: 1,
      remaining: 1,
      claimRate: 0.4,
      feePerClaimPaise: 5001,
    });
    expect(
      analytics.claimedBeforeExpiry + analytics.deactivated + analytics.expired + analytics.remaining,
    ).toBe(analytics.totalInventory);
  });

  it('counts deactivated vouchers before expired unclaimed vouchers', () => {
    const analytics = calculateCampaignAnalytics([
      voucher({ reportCount: 5, isActive: false, expiryDate: new Date('2026-08-18T00:00:00.000Z') }),
    ], { status: 'paid', totalPaise: 9900 }, now);

    expect(analytics.deactivated).toBe(1);
    expect(analytics.expired).toBe(0);
  });

  it('returns zero claim rate and no fee when no voucher was claimed before expiry', () => {
    const analytics = calculateCampaignAnalytics([
      voucher(),
      voucher({ expiryDate: new Date('2026-08-18T00:00:00.000Z') }),
    ], { status: 'paid', totalPaise: 10100 }, now);

    expect(analytics.claimRate).toBe(0);
    expect(analytics.feePerClaimPaise).toBeNull();
  });
});

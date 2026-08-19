import { describe, expect, it } from 'vitest';
import { buildDemoFixtures } from './seed-demo.mjs';

const fixedNow = new Date('2026-08-19T12:00:00.000Z');

describe('demo seed fixtures', () => {
  it('builds internally consistent business demo fixtures', () => {
    const fixtures = buildDemoFixtures(fixedNow);
    const paid = fixtures.campaigns.find((campaign) => campaign.status === 'active');

    expect(paid).toBeDefined();
    expect(fixtures.users).toEqual(expect.arrayContaining([
      expect.objectContaining({ email: 'demo@vouchit.app', role: 'customer' }),
      expect.objectContaining({ email: 'business@vouchit.app', role: 'business' }),
    ]));
    expect(fixtures.businessProfiles).toEqual(expect.arrayContaining([
      expect.objectContaining({ userKey: 'business-user' }),
    ]));

    const inventory = fixtures.vouchers.filter((voucher) => voucher.campaignKey === paid?.seedKey);
    const invoice = fixtures.invoices.find((item) => item.campaignKey === paid?.seedKey);

    expect(invoice).toEqual(expect.objectContaining({ status: 'paid' }));
    expect(invoice?.totalPaise).toBe(9900 + 200 * inventory.length);
    expect(inventory.some((voucher) => voucher.isRedeemed)).toBe(true);
    expect(inventory.some((voucher) => !voucher.isRedeemed)).toBe(true);
    expect(inventory.every((voucher) => voucher.viewCount > 0)).toBe(true);
    expect(inventory.every((voucher) => voucher.naturalKey).valueOf()).toBe(true);
    expect(inventory.every((voucher) => (
      voucher.naturalKey?.campaignId === voucher.campaignKey
      && voucher.naturalKey.code === voucher.code
    ))).toBe(true);
  });

  it('includes expired campaign outcome evidence', () => {
    const fixtures = buildDemoFixtures(fixedNow);
    const expired = fixtures.campaigns.find((campaign) => campaign.status === 'completed');

    expect(expired).toEqual(expect.objectContaining({
      expiryDate: new Date('2026-08-18T12:00:00.000Z'),
    }));
    expect(fixtures.vouchers).toEqual(expect.arrayContaining([
      expect.objectContaining({
        campaignKey: expired?.seedKey,
        isRedeemed: true,
      }),
    ]));
  });
});

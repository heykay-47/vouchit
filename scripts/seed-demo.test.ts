import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildDemoFixtures,
  buildDemoReconciliationPlan,
  findStaleCampaignVoucherKeys,
} from './seed-demo.mjs';

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

  it('plans scoped redemption cleanup from the fixture voucher state', () => {
    const fixtures = buildDemoFixtures(fixedNow);
    const plan = buildDemoReconciliationPlan(fixtures);

    expect(plan.unredeemedVoucherCodes).toEqual(expect.arrayContaining([
      'COFFEE-REMAINING-01',
      'GPLAY20-DEMO',
    ]));
    expect(plan.redeemedVoucherCodes).toEqual(expect.arrayContaining([
      'COFFEE-CLAIMED-DEMO',
      'WEEKENDSTAY-DEMO',
    ]));
    expect(plan.seededUserKeys).toEqual([
      'customer-user',
      'business-user',
      'maya-user',
      'arjun-user',
    ]);
  });

  it('finds only stale vouchers inside seeded campaign inventory', () => {
    const fixtures = buildDemoFixtures(fixedNow);
    const plan = buildDemoReconciliationPlan(fixtures);

    expect(findStaleCampaignVoucherKeys([
      { campaignKey: 'active-campaign', code: 'COFFEE-REMAINING-01' },
      { campaignKey: 'active-campaign', code: 'STALE-CODE' },
      { campaignKey: 'unrelated-campaign', code: 'DO-NOT-DELETE' },
    ], plan)).toEqual([
      { campaignKey: 'active-campaign', code: 'STALE-CODE' },
    ]);
  });

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
});

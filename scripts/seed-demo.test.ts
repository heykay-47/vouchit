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

  it('provides one active grouped campaign with multiple remaining codes', () => {
    const fixtures = buildDemoFixtures(fixedNow);
    const active = fixtures.campaigns.find((campaign) => campaign.status === 'active');
    const inventory = fixtures.vouchers.filter((voucher) => voucher.campaignKey === active?.seedKey);

    expect(fixtures.campaigns.filter((campaign) => campaign.status === 'active')).toHaveLength(1);
    expect(inventory.filter((voucher) => !voucher.isRedeemed)).toHaveLength(2);
    expect(inventory.filter((voucher) => voucher.isRedeemed)).toHaveLength(1);
    expect(new Set(inventory.map((voucher) => voucher.redeemedByKey).filter(Boolean)).size).toBe(1);
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

  it('mirrors the runtime offer discovery and campaign claim indexes', () => {
    const source = readFileSync(resolve(process.cwd(), 'scripts/seed-demo.mjs'), 'utf8');

    expect(source).toContain('campaignSchema.index({ status: 1, expiryDate: 1, _id: 1 });');
    expect(source).toContain('voucherSchema.index({ sourceType: 1, isActive: 1, isRedeemed: 1, expiryDate: 1, _id: 1 });');
    expect(source).toContain('voucherSchema.index({ campaignId: 1, sourceType: 1, isActive: 1, isRedeemed: 1, expiryDate: 1, _id: 1 });');
    expect(source).toContain('voucherSchema.index({ campaignId: 1, redeemedBy: 1 });');
    expect(source).toContain("campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', default: null }");
    expect(source).toContain(`redeemedVoucherSchema.index(
  { userId: 1, campaignId: 1 },
  {
    unique: true,
    partialFilterExpression: { campaignId: { $type: 'objectId' } },
  },
);`);
  });

  it('deletes all reset voucher history before recreating expected redemptions', () => {
    const source = readFileSync(resolve(process.cwd(), 'scripts/seed-demo.mjs'), 'utf8');
    const cleanupStart = source.indexOf('const seededVoucherIds = fixtures.vouchers');
    const recreationStart = source.indexOf('for (const fixture of fixtures.vouchers.filter((item) => item.isRedeemed))');

    expect(cleanupStart).toBeGreaterThan(-1);
    expect(recreationStart).toBeGreaterThan(cleanupStart);

    const cleanupSource = source.slice(cleanupStart, recreationStart);
    expect(cleanupSource).toContain(`const seededVoucherIds = fixtures.vouchers
    .map((fixture) => vouchers[fixture.code]._id);`);
    expect(cleanupSource).toContain(`await RedeemedVoucher.deleteMany({
      voucherId: { $in: seededVoucherIds },
    });`);
    expect(cleanupSource).not.toContain('userId:');
  });

  it('documents grouped offer discovery and its claim boundary', () => {
    const readme = readFileSync(resolve(process.cwd(), 'README.md'), 'utf8');
    const product = readFileSync(resolve(process.cwd(), 'PRODUCT.md'), 'utf8');
    const changelog = readFileSync(resolve(process.cwd(), 'CHANGELOG.md'), 'utf8');
    const deployment = readFileSync(resolve(process.cwd(), 'DEMO_DEPLOYMENT.md'), 'utf8');

    expect(readme).toContain('| GET | `/api/offers` | No |');
    expect(readme).toContain('| POST | `/api/offers/campaign/:campaignId/claim` | Customer |');
    expect(readme).toContain('| POST | `/api/offers/campaign/:campaignId/view` | No |');
    expect(readme).toContain('| POST | `/api/vouchers/:id/redeem` | Customer | Redeem a community voucher |');
    expect(product).toContain('server-side search');
    expect(product).toContain('one campaign code per customer');
    expect(product).toContain('remaining inventory');
    expect(changelog).toContain('server-side offer discovery');
    expect(deployment).toContain('grouped campaign offer');
    expect(deployment).toContain('demo@vouchit.app` already claimed');
    expect(deployment).toContain('maya@vouchit.app` to demonstrate a fresh claim');
  });

  it('requires a caller-provided password without printing demo credentials', () => {
    const source = readFileSync(resolve(process.cwd(), 'scripts/seed-demo.mjs'), 'utf8');
    const exampleEnv = readFileSync(resolve(process.cwd(), '.env.example'), 'utf8');

    expect(source).toContain("throw new Error('DEMO_PASSWORD is required')");
    expect(source).not.toMatch(/process\.env\.DEMO_PASSWORD\s*\|\|/);
    expect(source).not.toMatch(/console\.log\('(Customer|Business) login:/);
    expect(exampleEnv).toContain('DEMO_PASSWORD=\n');
    expect(exampleEnv).not.toContain('DemoPass123!');
  });
});

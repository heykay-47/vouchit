import { describe, expect, it } from 'vitest';
import { User } from './User.js';
import { Voucher } from './Voucher.js';
import { Favorite } from './Favorite.js';
import { ReportedVoucher } from './ReportedVoucher.js';
import { BusinessProfile } from './BusinessProfile.js';
import { Campaign } from './Campaign.js';
import { Invoice } from './Invoice.js';
import { RedeemedVoucher } from './RedeemedVoucher.js';

describe('mongoose models', () => {
  it('defines core collection names', () => {
    expect(User.collection.name).toBe('users');
    expect(Voucher.collection.name).toBe('vouchers');
    expect(Favorite.collection.name).toBe('favorites');
    expect(ReportedVoucher.collection.name).toBe('reportedvouchers');
    expect(Campaign.collection.name).toBe('campaigns');
    expect(Invoice.collection.name).toBe('invoices');
  });

  it('sets voucher defaults', () => {
    const voucher = new Voucher({
      platform: 'Google Pay',
      title: 'Test',
      description: 'Desc',
      code: 'SAVE10',
      imageUrl: 'data:image/png;base64,abc',
      donatedBy: '507f1f77bcf86cd799439011',
    });

    expect(voucher.isRedeemed).toBe(false);
    expect(voucher.reportCount).toBe(0);
    expect(voucher.isActive).toBe(true);
  });

  it('defaults campaigns to draft', () => {
    const campaign = new Campaign({
      businessId: '507f1f77bcf86cd799439011',
      businessProfileId: '507f1f77bcf86cd799439012',
      title: 'Save on groceries',
      brandName: 'Fresh Market',
      description: 'A grocery offer',
      terms: 'One use per customer',
      platform: 'Google Pay',
      category: 'Shopping',
      imageUrl: 'https://example.com/campaign.png',
      expiryDate: new Date('2026-09-01T00:00:00.000Z'),
    });

    expect(campaign.status).toBe('draft');
    expect(campaign.lockedAt).toBeNull();
  });

  it('indexes campaigns by owner and status', () => {
    const indexes = Campaign.schema.indexes();

    expect(indexes).toEqual(expect.arrayContaining([
      [{ businessId: 1 }, expect.anything()],
      [{ status: 1 }, expect.anything()],
    ]));
  });

  it('creates private campaign voucher defaults', () => {
    const voucher = new Voucher({
      sourceType: 'campaign',
      campaignId: '507f1f77bcf86cd799439012',
      code: 'SAVE50',
      value: '50',
      donatedBy: '507f1f77bcf86cd799439011',
      expiryDate: new Date('2026-09-01T00:00:00.000Z'),
    });

    expect(voucher.validateSync()).toBeUndefined();
    expect(voucher.isActive).toBe(false);
    expect(voucher.viewCount).toBe(0);
    expect(voucher.sourceType).toBe('campaign');
  });

  it('requires campaign references only for campaign vouchers', () => {
    const voucher = new Voucher({
      sourceType: 'campaign',
      code: 'SAVE50',
      donatedBy: '507f1f77bcf86cd799439011',
    });

    expect(voucher.validateSync()?.errors.campaignId).toBeDefined();
  });

  it('keeps presentation fields required for community vouchers', () => {
    const voucher = new Voucher({
      sourceType: 'community',
      code: 'SAVE50',
      donatedBy: '507f1f77bcf86cd799439011',
    });

    const error = voucher.validateSync();

    expect(error?.errors.platform).toBeDefined();
    expect(error?.errors.title).toBeDefined();
    expect(error?.errors.description).toBeDefined();
    expect(error?.errors.imageUrl).toBeDefined();
  });

  it('adds a campaign-only unique code index', () => {
    const indexes = Voucher.schema.indexes();

    expect(indexes).toEqual(expect.arrayContaining([
      [
        { campaignId: 1, code: 1 },
        expect.objectContaining({
          unique: true,
          partialFilterExpression: { sourceType: 'campaign' },
        }),
      ],
    ]));
  });

  it('defaults new users to the customer role', () => {
    const user = new User({ email: 'legacy@example.com', username: 'legacy', passwordHash: 'hash' });
    expect(user.role).toBe('customer');
  });

  it('allows one business profile per user', () => {
    const indexes = BusinessProfile.schema.indexes();
    expect(indexes).toEqual(expect.arrayContaining([
      [{ userId: 1 }, expect.objectContaining({ unique: true })],
    ]));
  });

  it('defines immutable invoice pricing snapshots', () => {
    const invoice = new Invoice({
      campaignId: '507f1f77bcf86cd799439013',
      businessId: '507f1f77bcf86cd799439011',
      priceVersion: 'v1',
      currency: 'INR',
      baseFeePaise: 9900,
      perVoucherFeePaise: 200,
      quantity: 3,
      totalPaise: 10500,
    });

    expect(invoice.validateSync()).toBeUndefined();
    expect(invoice.status).toBe('issued');
    expect(invoice.issuedAt).toBeInstanceOf(Date);
    expect(Invoice.schema.path('campaignId').options.immutable).toBe(true);
    expect(Invoice.schema.path('businessId').options.immutable).toBe(true);
    expect(Invoice.schema.path('priceVersion').options.immutable).toBe(true);
    expect(Invoice.schema.path('currency').options.immutable).toBe(true);
    expect(Invoice.schema.path('baseFeePaise').options.immutable).toBe(true);
    expect(Invoice.schema.path('perVoucherFeePaise').options.immutable).toBe(true);
    expect(Invoice.schema.path('quantity').options.immutable).toBe(true);
    expect(Invoice.schema.path('totalPaise').options.immutable).toBe(true);
  });

  it('indexes invoices uniquely by campaign and external reference per business', () => {
    const indexes = Invoice.schema.indexes();

    expect(indexes).toEqual(expect.arrayContaining([
      [{ campaignId: 1 }, expect.objectContaining({ unique: true })],
      [
        { businessId: 1, externalPaymentReference: 1 },
        expect.objectContaining({
          unique: true,
          partialFilterExpression: { externalPaymentReference: { $type: 'string' } },
        }),
      ],
    ]));
  });

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
});

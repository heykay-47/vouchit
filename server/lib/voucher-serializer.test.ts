import { describe, expect, it } from 'vitest';
import { toVoucherResponse } from './voucher-serializer.js';

const donorId = '507f1f77bcf86cd799439011';
const customerId = '507f1f77bcf86cd799439022';
const campaignId = '507f1f77bcf86cd799439012';
const baseVoucher = {
  _id: '507f1f77bcf86cd799439013',
  code: 'SECRET-CODE',
  donatedBy: donorId,
  donatedAt: new Date('2026-08-19T00:00:00.000Z'),
  isRedeemed: false,
  isActive: true,
  reportCount: 0,
};

describe('voucher serializer', () => {
  it('hides the code from anonymous and unrelated viewers', () => {
    expect(toVoucherResponse(baseVoucher)).not.toHaveProperty('code');
    expect(toVoucherResponse(baseVoucher, customerId)).not.toHaveProperty('code');
  });

  it('shows the code to the donor and claiming customer', () => {
    expect(toVoucherResponse(baseVoucher, donorId).code).toBe('SECRET-CODE');
    expect(toVoucherResponse({ ...baseVoucher, redeemedBy: customerId, isRedeemed: true }, customerId).code)
      .toBe('SECRET-CODE');
  });

  it('adds campaign attribution and campaign presentation fields', () => {
    const response = toVoucherResponse(
      {
        ...baseVoucher,
        sourceType: 'campaign',
        campaignId,
      },
      donorId,
      {
        campaign: {
          _id: campaignId,
          businessId: donorId,
          brandName: 'Fresh Market',
          title: 'Save on groceries',
          description: 'A grocery offer',
          platform: 'Google Pay',
          category: 'Shopping',
          imageUrl: 'https://example.com/campaign.png',
          expiryDate: new Date('2026-09-01T00:00:00.000Z'),
        },
        profile: { organizationName: 'Fresh Market Ltd' },
      },
    );

    expect(response).toMatchObject({
      sourceType: 'campaign',
      title: 'Save on groceries',
      platform: 'Google Pay',
      campaign: {
        campaignId,
        brandName: 'Fresh Market',
        organizationName: 'Fresh Market Ltd',
      },
    });
  });

  it('defaults missing source types to community', () => {
    expect(toVoucherResponse(baseVoucher).sourceType).toBe('community');
    expect(toVoucherResponse(baseVoucher)).not.toHaveProperty('campaign');
  });

  it('does not expose campaign codes through the generic serializer to the business owner', () => {
    const response = toVoucherResponse(
      { ...baseVoucher, sourceType: 'campaign', campaignId },
      donorId,
      { campaign: { _id: campaignId, businessId: donorId, brandName: 'Fresh Market' } },
    );

    expect(response.code).toBeUndefined();
  });

  it('shows a claimed campaign code to the claiming customer', () => {
    const response = toVoucherResponse(
      {
        ...baseVoucher,
        sourceType: 'campaign',
        campaignId,
        redeemedBy: customerId,
        isRedeemed: true,
      },
      customerId,
      { campaign: { _id: campaignId, businessId: donorId, brandName: 'Fresh Market' } },
    );

    expect(response.code).toBe('SECRET-CODE');
  });
});

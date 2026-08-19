import { describe, expect, it } from 'vitest';
import { toBusinessVoucherResponse, toCampaignResponse } from './business-serializers.js';

const id = '507f1f77bcf86cd799439011';

describe('business serializers', () => {
  it('resolves missing voucher source types to community', () => {
    const response = toBusinessVoucherResponse({
      _id: id,
      code: 'SAVE10',
      donatedBy: id,
      sourceType: undefined,
      campaignId: undefined,
      isActive: true,
      isRedeemed: false,
      viewCount: 0,
    });

    expect(response.sourceType).toBe('community');
    expect(response.campaignId).toBeUndefined();
  });

  it('serializes campaign voucher ownership and view state', () => {
    const response = toBusinessVoucherResponse({
      _id: id,
      sourceType: 'campaign',
      campaignId: '507f1f77bcf86cd799439012',
      code: 'SAVE50',
      value: '50',
      donatedBy: id,
      expiryDate: new Date('2026-09-01T00:00:00.000Z'),
      isActive: false,
      isRedeemed: false,
      viewCount: 3,
    });

    expect(response).toMatchObject({
      id,
      sourceType: 'campaign',
      campaignId: '507f1f77bcf86cd799439012',
      code: 'SAVE50',
      donatedBy: id,
      viewCount: 3,
    });
  });

  it('derives expired completion without mutating persisted campaign status', () => {
    const campaign = {
      _id: id,
      businessId: id,
      businessProfileId: '507f1f77bcf86cd799439012',
      title: 'Save on groceries',
      brandName: 'Fresh Market',
      description: 'A grocery offer',
      terms: 'One use per customer',
      platform: 'Google Pay',
      category: 'Shopping',
      imageUrl: 'https://example.com/campaign.png',
      expiryDate: new Date('2026-08-18T00:00:00.000Z'),
      status: 'active',
      lockedAt: new Date('2026-08-01T00:00:00.000Z'),
      createdAt: new Date('2026-07-01T00:00:00.000Z'),
      updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    };

    const response = toCampaignResponse(
      campaign,
      'Fresh Market Ltd',
      new Date('2026-08-19T00:00:00.000Z'),
    );

    expect(response.organizationName).toBe('Fresh Market Ltd');
    expect(response.status).toBe('active');
    expect(response.effectiveStatus).toBe('completed');
    expect(response.completionReason).toBe('expired');
  });
});

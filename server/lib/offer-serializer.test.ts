import { describe, expect, it } from 'vitest';
import { toPublicOffer, type OfferAggregateRow } from './offer-serializer.js';

describe('public offer serializer', () => {
  it('serializes a campaign without inventory secrets', () => {
    const response = toPublicOffer({
      _id: '507f1f77bcf86cd799439011',
      kind: 'campaign',
      title: 'Weekend reward',
      description: 'Use this weekend',
      terms: 'One use per customer',
      platform: 'Google Pay',
      category: 'Shopping',
      imageUrl: 'https://example.com/campaign.png',
      expiryDate: new Date('2026-09-01T00:00:00.000Z'),
      value: 'INR 200',
      brandName: 'Fresh',
      organizationName: 'Fresh Ltd',
      remainingCount: 3,
      code: 'DO-NOT-LEAK',
      voucherId: '507f1f77bcf86cd799439099',
      businessId: '507f1f77bcf86cd799439098',
      missingExpiry: 0,
    });

    expect(response).toEqual(expect.objectContaining({
      kind: 'campaign',
      id: '507f1f77bcf86cd799439011',
      remainingCount: 3,
      value: 'INR 200',
    }));
    expect(response).not.toHaveProperty('code');
    expect(response).not.toHaveProperty('voucherId');
    expect(response).not.toHaveProperty('businessId');
  });

  it('keeps nullable common fields explicit on a community offer', () => {
    const response = toPublicOffer({
      _id: '507f1f77bcf86cd799439012',
      kind: 'community',
      title: 'No-expiry reward',
      description: 'Shared reward',
      platform: 'Paytm',
      imageUrl: 'https://example.com/community.png',
      expiryDate: null,
      donatedAt: new Date('2026-08-23T00:00:00.000Z'),
      missingExpiry: 1,
    });

    expect(response).toHaveProperty('expiryDate', null);
    expect(response).toHaveProperty('category', null);
  });

  it('reveals a community donor only to that donor', () => {
    const row: OfferAggregateRow = {
      _id: '507f1f77bcf86cd799439012',
      kind: 'community',
      title: 'Shared reward',
      description: 'Shared reward',
      platform: 'Paytm',
      imageUrl: 'https://example.com/community.png',
      expiryDate: null,
      donatedBy: { toString: () => '507f1f77bcf86cd799439022' },
      missingExpiry: 1,
    };

    expect(toPublicOffer(row, '507f1f77bcf86cd799439022')).toHaveProperty(
      'donatedBy',
      '507f1f77bcf86cd799439022',
    );
    expect(toPublicOffer(row, '507f1f77bcf86cd799439023')).toHaveProperty('donatedBy', 'anonymous');
  });
});

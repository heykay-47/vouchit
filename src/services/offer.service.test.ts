import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { CampaignOffer, CommunityOffer } from '@/lib/types';
import { apiRequest } from './api-client';
import { offerService } from './offer.service';

vi.mock('./api-client', () => ({
  apiRequest: vi.fn(),
}));

const mockedApiRequest = vi.mocked(apiRequest);

const apiCommunityOffer = {
  kind: 'community' as const,
  id: 'community-1',
  sourceType: 'community' as const,
  platform: 'Google Pay' as const,
  category: null,
  title: 'Community reward',
  description: 'Shared reward',
  imageUrl: 'https://example.com/community.png',
  expiryDate: '2026-09-01T00:00:00.000Z',
  donatedBy: 'anonymous',
  donatedAt: '2026-08-23T00:00:00.000Z',
  isRedeemed: false,
  reportCount: 0,
  isActive: true,
};

const apiCampaignOffer = {
  kind: 'campaign' as const,
  id: 'campaign-1',
  title: 'Campaign reward',
  description: 'Published reward',
  terms: 'One use per customer',
  platform: 'Google Pay' as const,
  category: 'Shopping' as const,
  imageUrl: 'https://example.com/campaign.png',
  expiryDate: '2026-09-02T00:00:00.000Z',
  brandName: 'Fresh Rewards',
  organizationName: 'Fresh Market Ltd',
  remainingCount: 3,
};

const apiClaimedVoucher = {
  id: 'campaign-voucher-1',
  sourceType: 'campaign' as const,
  platform: 'Google Pay' as const,
  title: 'Campaign reward',
  description: 'Published reward',
  code: 'ASSIGNED-CODE',
  imageUrl: 'https://example.com/campaign.png',
  expiryDate: '2026-09-02T00:00:00.000Z',
  donatedBy: 'business-1',
  donatedAt: '2026-08-20T00:00:00.000Z',
  isRedeemed: true,
  redeemedBy: 'customer-1',
  redeemedAt: '2026-08-23T01:00:00.000Z',
  reportCount: 0,
  isActive: true,
  category: 'Shopping' as const,
};

describe('offer service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('serializes canonical filters and hydrates offer dates', async () => {
    mockedApiRequest.mockResolvedValue({
      offers: [apiCommunityOffer, apiCampaignOffer],
      total: 2,
      nextCursor: 'opaque-cursor',
      hasMore: true,
    });

    const page = await offerService.list({
      q: 'fresh',
      platform: 'Google Pay',
      category: 'Shopping',
      source: 'campaign',
      expiringSoon: true,
    }, null);

    expect(mockedApiRequest).toHaveBeenCalledWith(
      '/api/offers?q=fresh&platform=Google+Pay&category=Shopping&source=campaign&expiringSoon=true&limit=24',
    );
    expect(page.offers[0].expiryDate).toEqual(new Date(apiCommunityOffer.expiryDate));
    expect(page.offers[0]).toMatchObject({
      category: undefined,
      donatedAt: new Date(apiCommunityOffer.donatedAt),
    });
    expect(page.offers[1].expiryDate).toEqual(new Date(apiCampaignOffer.expiryDate));
    expect(page.nextCursor).toBe('opaque-cursor');
  });

  it('omits default filters and preserves the exact opaque cursor', async () => {
    mockedApiRequest.mockResolvedValue({
      offers: [{ ...apiCommunityOffer, expiryDate: null }],
      total: 1,
      nextCursor: null,
      hasMore: false,
    });

    const page = await offerService.list({
      q: '',
      source: 'all',
      expiringSoon: false,
    }, 'v1:+/= opaque');

    expect(mockedApiRequest).toHaveBeenCalledWith('/api/offers?limit=24&cursor=v1%3A%2B%2F%3D+opaque');
    expect(page.offers[0].expiryDate).toBeUndefined();
  });

  it('calls campaign claim and view endpoints without exposing inventory ids', async () => {
    mockedApiRequest
      .mockResolvedValueOnce({ voucher: apiClaimedVoucher, message: 'Campaign voucher claimed' })
      .mockResolvedValueOnce({ recorded: true });

    const result = await offerService.claimCampaign('campaign-1');
    await offerService.recordCampaignView('campaign-1');

    expect(mockedApiRequest).toHaveBeenNthCalledWith(1, '/api/offers/campaign/campaign-1/claim', { method: 'POST' });
    expect(mockedApiRequest).toHaveBeenNthCalledWith(2, '/api/offers/campaign/campaign-1/view', { method: 'POST' });
    expect(result.voucher).toMatchObject({
      donatedAt: new Date(apiClaimedVoucher.donatedAt),
      expiryDate: new Date(apiClaimedVoucher.expiryDate),
      redeemedAt: new Date(apiClaimedVoucher.redeemedAt),
    });
  });
});

type CommunityOfferHasCode = 'code' extends keyof CommunityOffer ? true : false;
expectTypeOf<CommunityOfferHasCode>().toEqualTypeOf<false>();
expectTypeOf<CampaignOffer['value']>().toEqualTypeOf<string | undefined>();

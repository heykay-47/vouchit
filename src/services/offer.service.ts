import type {
  CampaignClaimResponse,
  CampaignOffer,
  CommunityOffer,
  OfferFilters,
  OfferPage,
  ResolvedVoucher,
  VoucherCategory,
} from '@/lib/types';
import { apiRequest } from './api-client';

type ApiCommunityOffer = Omit<CommunityOffer, 'expiryDate' | 'category' | 'donatedAt'> & {
  expiryDate: string | Date | null;
  category: VoucherCategory | null;
  donatedAt: string | Date;
};
type ApiCampaignOffer = Omit<CampaignOffer, 'expiryDate'> & { expiryDate: string | Date };
type ApiOfferPage = Omit<OfferPage, 'offers'> & {
  offers: Array<ApiCommunityOffer | ApiCampaignOffer>;
};
type ApiCampaignClaimResponse = Omit<CampaignClaimResponse, 'voucher'> & {
  voucher: Omit<ResolvedVoucher, 'donatedAt' | 'expiryDate' | 'redeemedAt'> & {
    donatedAt: string | Date;
    expiryDate?: string | Date;
    redeemedAt?: string | Date;
  };
};

const hydrateVoucher = (voucher: ApiCampaignClaimResponse['voucher']): ResolvedVoucher => {
  const { donatedAt, expiryDate, redeemedAt, ...rest } = voucher;
  return {
    ...rest,
    sourceType: voucher.sourceType ?? 'community',
    donatedAt: new Date(donatedAt),
    ...(expiryDate ? { expiryDate: new Date(expiryDate) } : {}),
    ...(redeemedAt ? { redeemedAt: new Date(redeemedAt) } : {}),
  };
};

const toOfferQueryParams = (filters: OfferFilters, cursor: string | null) => {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.platform) params.set('platform', filters.platform);
  if (filters.category) params.set('category', filters.category);
  if (filters.source !== 'all') params.set('source', filters.source);
  if (filters.expiringSoon) params.set('expiringSoon', 'true');
  params.set('limit', '24');
  if (cursor) params.set('cursor', cursor);
  return params;
};

const hydrateOfferPage = (page: ApiOfferPage): OfferPage => ({
  ...page,
  offers: page.offers.map((offer) => offer.kind === 'campaign'
    ? { ...offer, expiryDate: new Date(offer.expiryDate) }
    : {
        ...offer,
        donatedAt: new Date(offer.donatedAt),
        expiryDate: offer.expiryDate ? new Date(offer.expiryDate) : undefined,
        category: offer.category ?? undefined,
      }),
});

export const offerService = {
  list: async (filters: OfferFilters, cursor: string | null): Promise<OfferPage> => {
    const params = toOfferQueryParams(filters, cursor);
    const page = await apiRequest<ApiOfferPage>(`/api/offers?${params}`);
    return hydrateOfferPage(page);
  },

  claimCampaign: async (campaignId: string): Promise<CampaignClaimResponse> => {
    const result = await apiRequest<ApiCampaignClaimResponse>(
      `/api/offers/campaign/${campaignId}/claim`,
      { method: 'POST' },
    );
    return { ...result, voucher: hydrateVoucher(result.voucher) };
  },

  recordCampaignView: (campaignId: string) => apiRequest<{ recorded: true }>(
    `/api/offers/campaign/${campaignId}/view`,
    { method: 'POST' },
  ),
};

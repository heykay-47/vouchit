import type {
  OfferFilters,
  OfferSourceFilter,
  VoucherCategory,
  VoucherPlatform,
} from './types';

export const VOUCHER_PLATFORMS: VoucherPlatform[] = ['Google Pay', 'Paytm', 'PhonePe', 'Other'];
export const VOUCHER_CATEGORIES: VoucherCategory[] = [
  'Food',
  'Shopping',
  'Travel',
  'Entertainment',
  'Electronics',
  'Health',
  'Other',
];
export const OFFER_SOURCES: OfferSourceFilter[] = ['all', 'community', 'campaign'];

const isVoucherPlatform = (value: string | null): value is VoucherPlatform => (
  value !== null && VOUCHER_PLATFORMS.includes(value as VoucherPlatform)
);

const isVoucherCategory = (value: string | null): value is VoucherCategory => (
  value !== null && VOUCHER_CATEGORIES.includes(value as VoucherCategory)
);

const isOfferSource = (value: string | null): value is OfferSourceFilter => (
  value !== null && OFFER_SOURCES.includes(value as OfferSourceFilter)
);

export const DEFAULT_OFFER_FILTERS: OfferFilters = {
  q: '',
  source: 'all',
  expiringSoon: false,
};

export const parseOfferFilters = (params: URLSearchParams): OfferFilters => ({
  q: (params.get('q') ?? '').trim().slice(0, 100),
  ...(isVoucherPlatform(params.get('platform'))
    ? { platform: params.get('platform') as VoucherPlatform }
    : {}),
  ...(isVoucherCategory(params.get('category'))
    ? { category: params.get('category') as VoucherCategory }
    : {}),
  source: isOfferSource(params.get('source'))
    ? params.get('source') as OfferSourceFilter
    : 'all',
  expiringSoon: params.get('expiring') === 'true',
});

export const writeOfferFilters = (current: URLSearchParams, filters: OfferFilters) => {
  const next = new URLSearchParams(current);
  ['q', 'platform', 'category', 'source', 'expiring'].forEach((key) => next.delete(key));

  if (filters.q) next.set('q', filters.q);
  if (filters.platform) next.set('platform', filters.platform);
  if (filters.category) next.set('category', filters.category);
  if (filters.source !== 'all') next.set('source', filters.source);
  if (filters.expiringSoon) next.set('expiring', 'true');

  return next;
};

export const hasActiveOfferFilters = (filters: OfferFilters) => Boolean(
  filters.q
  || filters.platform
  || filters.category
  || filters.source !== 'all'
  || filters.expiringSoon
);

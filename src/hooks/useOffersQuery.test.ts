import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  CampaignOffer,
  CommunityOffer,
  OfferFilters,
  OfferPage,
  ResolvedVoucher,
  User,
} from '@/lib/types';
import { ApiClientError } from '@/services/api-client';
import { offerService } from '@/services/offer.service';
import { vouchersQueryKey } from './useVouchersQuery';
import {
  flattenOfferPages,
  offerQueryKeys,
  offersQueryKey,
  useClaimCampaignMutation,
  useOffersQuery,
} from './useOffersQuery';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  list: vi.fn(),
  claimCampaign: vi.fn(),
  recordCampaignView: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: mocks.useAuth }));
vi.mock('@/services/offer.service', () => ({
  offerService: {
    list: mocks.list,
    claimCampaign: mocks.claimCampaign,
    recordCampaignView: mocks.recordCampaignView,
  },
}));

const customer: User = {
  id: 'customer-1',
  email: 'customer@example.com',
  username: 'customer',
  role: 'customer',
  createdAt: new Date('2026-08-23T00:00:00.000Z'),
  redeemedVouchers: [],
};

const community = (id: string): CommunityOffer => ({
  kind: 'community',
  id,
  sourceType: 'community',
  platform: 'Google Pay',
  category: undefined,
  title: 'Community reward',
  description: 'Shared reward',
  imageUrl: 'https://example.com/community.png',
  expiryDate: new Date('2026-09-01T00:00:00.000Z'),
  donatedBy: 'anonymous',
  donatedAt: new Date('2026-08-23T00:00:00.000Z'),
  isRedeemed: false,
  reportCount: 0,
  isActive: true,
});

const campaign = (id: string): CampaignOffer => ({
  kind: 'campaign',
  id,
  title: 'Campaign reward',
  description: 'Published reward',
  terms: 'One use per customer',
  platform: 'Google Pay',
  category: 'Shopping',
  imageUrl: 'https://example.com/campaign.png',
  expiryDate: new Date('2026-09-02T00:00:00.000Z'),
  brandName: 'Fresh Rewards',
  organizationName: 'Fresh Market Ltd',
  remainingCount: 3,
});

const { kind: _kind, ...claimedBase } = community('campaign-voucher-1');
const claimedVoucher: ResolvedVoucher = {
  ...claimedBase,
  sourceType: 'campaign',
  code: 'ASSIGNED-CODE',
  isRedeemed: true,
  redeemedBy: customer.id,
  redeemedAt: new Date('2026-08-23T01:00:00.000Z'),
};

const defaultFilters: OfferFilters = { q: '', source: 'all', expiringSoon: false };
const firstPage: OfferPage = {
  offers: [community('community-1')],
  total: 2,
  nextCursor: 'opaque-cursor',
  hasMore: true,
};
const secondPage: OfferPage = {
  offers: [campaign('campaign-1')],
  total: 2,
  nextCursor: null,
  hasMore: false,
};

let queryClient: QueryClient;
let wrapper: ({ children }: PropsWithChildren) => ReturnType<typeof createElement>;

describe('offer queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuth.mockReturnValue({ user: customer, viewerKey: customer.id, isLoading: false });
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    wrapper = ({ children }: PropsWithChildren) => createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('uses viewer identity and the exact opaque cursor for the next page', async () => {
    vi.mocked(offerService.list)
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce(secondPage);

    const { result } = renderHook(() => useOffersQuery(defaultFilters), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await result.current.fetchNextPage();

    expect(offerService.list).toHaveBeenNthCalledWith(1, defaultFilters, null);
    expect(offerService.list).toHaveBeenNthCalledWith(2, defaultFilters, firstPage.nextCursor);
    expect(queryClient.getQueryCache().findAll({ queryKey: offersQueryKey })[0]?.queryKey)
      .toEqual(offerQueryKeys.list(customer.id, defaultFilters));
  });

  it('uses an anonymous viewer key and waits for auth loading to finish', async () => {
    mocks.useAuth.mockReturnValue({ user: null, viewerKey: null, isLoading: true });
    vi.mocked(offerService.list).mockResolvedValue(firstPage);

    const { result, rerender } = renderHook(() => useOffersQuery(defaultFilters), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(offerService.list).not.toHaveBeenCalled();

    mocks.useAuth.mockReturnValue({ user: null, viewerKey: 'anonymous', isLoading: false });
    rerender();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.getQueryCache().find({
      queryKey: offerQueryKeys.list('anonymous', defaultFilters),
    })).toBeDefined();
  });

  it('deduplicates only the same kind and id', () => {
    expect(flattenOfferPages([
      { ...firstPage, offers: [community('same-id'), campaign('same-id')] },
      { ...secondPage, offers: [community('same-id')] },
    ])).toEqual([community('same-id'), campaign('same-id')]);
  });

  it('keeps the claimed voucher and invalidates offer and voucher caches', async () => {
    const existingVoucher = { ...claimedVoucher, id: 'existing-voucher' };
    const staleClaim = { ...claimedVoucher, code: 'STALE-CODE' };
    const response = { voucher: claimedVoucher, message: 'Campaign voucher claimed' };
    vi.mocked(offerService.claimCampaign).mockResolvedValue(response);
    const activeViewerKey = [...vouchersQueryKey, customer.id] as const;
    const otherViewerKey = [...vouchersQueryKey, 'customer-2'] as const;
    queryClient.setQueryData(activeViewerKey, [existingVoucher, staleClaim]);
    queryClient.setQueryData(otherViewerKey, [staleClaim]);
    let resolveRefresh!: () => void;
    const refreshPending = new Promise<void>((resolve) => { resolveRefresh = resolve; });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockReturnValue(refreshPending);
    const { result } = renderHook(() => useClaimCampaignMutation(), { wrapper });

    await act(async () => result.current.mutateAsync('campaign-1'));

    await waitFor(() => expect(result.current.data).toEqual(response));
    expect(queryClient.getQueryData(activeViewerKey)).toEqual([claimedVoucher, existingVoucher]);
    expect(queryClient.getQueryData(otherViewerKey)).toEqual([staleClaim]);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: offersQueryKey });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: vouchersQueryKey });
    resolveRefresh();
  });

  it('does not seed a completed claim into a different active viewer cache', async () => {
    let resolveClaim!: (value: { voucher: ResolvedVoucher; message: string }) => void;
    const claimPending = new Promise<{ voucher: ResolvedVoucher; message: string }>((resolve) => {
      resolveClaim = resolve;
    });
    vi.mocked(offerService.claimCampaign).mockReturnValue(claimPending);
    const firstViewerKey = [...vouchersQueryKey, customer.id] as const;
    const secondViewerKey = [...vouchersQueryKey, 'customer-2'] as const;
    const { result, rerender } = renderHook(() => useClaimCampaignMutation(), { wrapper });

    let mutation!: Promise<{ voucher: ResolvedVoucher; message: string }>;
    act(() => { mutation = result.current.mutateAsync('campaign-1'); });
    mocks.useAuth.mockReturnValue({
      user: { ...customer, id: 'customer-2' },
      viewerKey: 'customer-2',
      isLoading: false,
    });
    rerender();

    await act(async () => {
      resolveClaim({ voucher: claimedVoucher, message: 'Campaign voucher claimed' });
      await mutation;
    });

    expect(queryClient.getQueryData(firstViewerKey)).toBeUndefined();
    expect(queryClient.getQueryData(secondViewerKey)).toBeUndefined();
  });

  it('refreshes discovery after a claim conflict', async () => {
    vi.mocked(offerService.claimCampaign).mockRejectedValue(new ApiClientError('conflict', 409));
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
    const { result } = renderHook(() => useClaimCampaignMutation(), { wrapper });

    await expect(result.current.mutateAsync('campaign-1')).rejects.toMatchObject({ status: 409 });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: offersQueryKey });
    expect(invalidate).toHaveBeenCalledTimes(1);
  });
});

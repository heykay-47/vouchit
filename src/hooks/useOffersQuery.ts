import { useRef } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import type { OfferFilters, OfferPage, ResolvedVoucher } from '@/lib/types';
import { ApiClientError } from '@/services/api-client';
import { offerService } from '@/services/offer.service';
import { createLogger } from '@/utils/logger';
import { voucherQueryKeys, vouchersQueryKey } from './useVouchersQuery';

const offerLogger = createLogger({ context: { component: 'useOffersQuery' } });

export const offersQueryKey = ['offers'] as const;
export const offerQueryKeys = {
  all: offersQueryKey,
  list: (viewerKey: string, filters: OfferFilters) => [
    ...offersQueryKey,
    viewerKey,
    filters,
  ] as const,
};

export const useOffersQuery = (filters: OfferFilters) => {
  const { viewerKey, isLoading } = useAuth();
  return useInfiniteQuery({
    queryKey: offerQueryKeys.list(viewerKey ?? 'unresolved', filters),
    queryFn: ({ pageParam }) => offerService.list(filters, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: viewerKey !== null && !isLoading,
  });
};

export const flattenOfferPages = (pages: OfferPage[]) => {
  const seen = new Set<string>();
  return pages.flatMap((page) => page.offers).filter((offer) => {
    const key = `${offer.kind}:${offer.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const useClaimCampaignMutation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const activeViewerId = useRef(user?.id);
  activeViewerId.current = user?.id;
  return useMutation({
    mutationFn: offerService.claimCampaign,
    onSuccess: ({ voucher }) => {
      if (voucher.redeemedBy && voucher.redeemedBy === activeViewerId.current) {
        queryClient.setQueryData<ResolvedVoucher[]>(
          voucherQueryKeys.list(voucher.redeemedBy),
          (current) => [
            voucher,
            ...(current ?? []).filter((item) => item.id !== voucher.id),
          ],
        );
      }
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: offersQueryKey }),
        queryClient.invalidateQueries({ queryKey: vouchersQueryKey }),
      ]).catch((error) => {
        offerLogger.error('Error refreshing data after campaign claim', error);
      });
    },
    onError: (error) => {
      if (error instanceof ApiClientError && error.status === 409) {
        void queryClient.invalidateQueries({ queryKey: offersQueryKey });
      }
    },
  });
};

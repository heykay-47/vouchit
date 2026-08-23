import { useQuery } from '@tanstack/react-query';
import { voucherService } from '@/services/voucher.service';

export const vouchersQueryKey = ['vouchers'] as const;
export const voucherQueryKeys = {
  all: vouchersQueryKey,
  list: (viewerKey: string) => [...vouchersQueryKey, viewerKey] as const,
};

export const useVouchersQuery = (viewerKey: string, enabled: boolean) => {
  return useQuery({
    queryKey: voucherQueryKeys.list(viewerKey),
    queryFn: voucherService.list,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
};

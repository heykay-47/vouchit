import { useQuery } from '@tanstack/react-query';
import { voucherService } from '@/services/voucher.service';

export const vouchersQueryKey = ['vouchers'] as const;

export const useVouchersQuery = () => {
  return useQuery({
    queryKey: vouchersQueryKey,
    queryFn: voucherService.list,
    staleTime: 5 * 60 * 1000,
  });
};

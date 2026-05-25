import { useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from '@/utils/toast';
import { Voucher } from '@/lib/types';
import { vouchersQueryKey } from '@/hooks/useVouchersQuery';
import { createLogger } from '@/utils/logger';
import { voucherService } from '@/services/voucher.service';

const voucherLogger = createLogger({ context: { component: 'useVoucherOperations' } });

type DonatePayload = Omit<Voucher, 'id' | 'donatedAt' | 'reportCount' | 'isActive'>;

export const useVoucherOperations = (setMutationError: (message: string | null) => void) => {
  const queryClient = useQueryClient();

  const donateMutation = useMutation({
    mutationFn: (voucherData: DonatePayload) => voucherService.donate(voucherData),
    onSuccess: () => {
      toast.success('Voucher donated successfully');
      setMutationError(null);
      queryClient.invalidateQueries({ queryKey: vouchersQueryKey });
    },
    onError: (error: Error) => {
      voucherLogger.error('Error donating voucher', error);
      setMutationError(error.message);
      toast.error(error.message || 'Failed to donate voucher');
    },
  });

  const redeemMutation = useMutation({
    mutationFn: (voucherId: string) => voucherService.redeem(voucherId),
    onSuccess: () => {
      toast.success('Voucher redeemed successfully');
      setMutationError(null);
      queryClient.invalidateQueries({ queryKey: vouchersQueryKey });
    },
    onError: (error: Error) => {
      voucherLogger.error('Error redeeming voucher', error);
      setMutationError(error.message);
      toast.error(error.message || 'Failed to redeem voucher');
    },
  });

  const reportMutation = useMutation({
    mutationFn: (voucherId: string) => voucherService.report(voucherId),
    onSuccess: () => {
      toast.success('Voucher reported as not working');
      setMutationError(null);
      queryClient.invalidateQueries({ queryKey: vouchersQueryKey });
    },
    onError: (error: Error) => {
      voucherLogger.error('Error reporting voucher', error);
      setMutationError(error.message);
      toast.error(error.message || 'Failed to report voucher');
    },
  });

  const donateVoucher = async (voucherData: DonatePayload) => {
    await donateMutation.mutateAsync(voucherData);
  };

  const redeemVoucher = async (voucherId: string) => {
    await redeemMutation.mutateAsync(voucherId);
  };

  const reportVoucher = async (voucherId: string) => {
    await reportMutation.mutateAsync(voucherId);
  };

  return { donateVoucher, redeemVoucher, reportVoucher };
};

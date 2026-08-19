import { ResolvedVoucher, Voucher, VoucherSourceType } from '@/lib/types';
import { apiRequest } from './api-client';

type VoucherDto = Omit<Voucher, 'sourceType'> & { sourceType?: VoucherSourceType };

export const voucherService = {
  async list(): Promise<ResolvedVoucher[]> {
    const { vouchers } = await apiRequest<{ vouchers: VoucherDto[] }>('/api/vouchers');
    return vouchers.map((voucher) => ({
      ...voucher,
      sourceType: voucher.sourceType ?? 'community',
      donatedAt: new Date(voucher.donatedAt),
      expiryDate: voucher.expiryDate ? new Date(voucher.expiryDate) : undefined,
      redeemedAt: voucher.redeemedAt ? new Date(voucher.redeemedAt) : undefined,
    }));
  },

  async recordView(voucherId: string): Promise<void> {
    await apiRequest<{ recorded: boolean }>(`/api/vouchers/${voucherId}/view`, {
      method: 'POST',
    });
  },

  async donate(voucher: Omit<Voucher, 'id' | 'donatedAt' | 'reportCount' | 'isActive'>) {
    return apiRequest<{ voucher: Voucher }>('/api/vouchers', {
      method: 'POST',
      body: JSON.stringify(voucher),
    });
  },

  async redeem(voucherId: string) {
    return apiRequest<{ voucher: Voucher; message: string }>(`/api/vouchers/${voucherId}/redeem`, {
      method: 'POST',
    });
  },

  async report(voucherId: string) {
    return apiRequest<{ voucher: Voucher; message: string }>(`/api/vouchers/${voucherId}/report`, {
      method: 'POST',
    });
  },
};

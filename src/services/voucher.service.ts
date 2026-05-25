import { Voucher } from '@/lib/types';
import { apiRequest } from './api-client';

export const voucherService = {
  async list() {
    const { vouchers } = await apiRequest<{ vouchers: Voucher[] }>('/api/vouchers');
    return vouchers.map((voucher) => ({
      ...voucher,
      donatedAt: new Date(voucher.donatedAt),
      expiryDate: voucher.expiryDate ? new Date(voucher.expiryDate) : undefined,
      redeemedAt: voucher.redeemedAt ? new Date(voucher.redeemedAt) : undefined,
    }));
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

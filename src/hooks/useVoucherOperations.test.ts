import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { createElement, type PropsWithChildren, type ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { offersQueryKey } from './useOffersQuery';
import { useVoucherOperations } from './useVoucherOperations';

const serviceMocks = vi.hoisted(() => ({
  donate: vi.fn(),
  redeem: vi.fn(),
  report: vi.fn(),
}));

vi.mock('@/services/voucher.service', () => ({ voucherService: serviceMocks }));
vi.mock('@/utils/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const setMutationError = vi.fn();
const voucherInput = {
  platform: 'Google Pay' as const,
  title: 'Community reward',
  description: 'Shared reward',
  code: 'SAVE10',
  imageUrl: 'https://example.com/voucher.png',
  donatedBy: 'customer-1',
  isRedeemed: false,
};

let queryClient: QueryClient;
let invalidateQueries: ReturnType<typeof vi.spyOn>;
let wrapper: ({ children }: PropsWithChildren) => ReactElement;

describe('useVoucherOperations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
    wrapper = ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children);
    serviceMocks.donate.mockResolvedValue({ voucher: { id: 'voucher-1' } });
    serviceMocks.redeem.mockResolvedValue({ voucher: { id: 'voucher-1', isRedeemed: true } });
    serviceMocks.report.mockResolvedValue({ voucher: { id: 'voucher-1', isActive: false } });
  });

  it.each(['donate', 'redeem', 'report'] as const)(
    'invalidates offers after %s success',
    async (operation) => {
      const { result } = renderHook(() => useVoucherOperations(setMutationError), { wrapper });
      const invoke = {
        donate: () => result.current.donateVoucher(voucherInput),
        redeem: () => result.current.redeemVoucher('voucher-1'),
        report: () => result.current.reportVoucher('voucher-1'),
      };

      await act(async () => invoke[operation]());

      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: offersQueryKey });
    },
  );
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { createElement, type PropsWithChildren, type ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { offersQueryKey } from './useOffersQuery';
import { vouchersQueryKey } from './useVouchersQuery';
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
    serviceMocks.redeem.mockResolvedValue({
      voucher: { id: 'voucher-1', isRedeemed: true, redeemedBy: 'customer-1' },
    });
    serviceMocks.report.mockResolvedValue({ voucher: { id: 'voucher-1', isActive: false } });
  });

  it.each(['donate', 'redeem', 'report'] as const)(
    'invalidates offers after %s success',
    async (operation) => {
      const { result } = renderHook(
        () => useVoucherOperations(setMutationError, 'customer-1'),
        { wrapper },
      );
      const invoke = {
        donate: () => result.current.donateVoucher(voucherInput),
        redeem: () => result.current.redeemVoucher('voucher-1'),
        report: () => result.current.reportVoucher('voucher-1'),
      };

      await act(async () => invoke[operation]());

      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: offersQueryKey });
    },
  );

  it('updates only the active viewer voucher cache after redeem', async () => {
    const activeViewerKey = [...vouchersQueryKey, 'customer-1'] as const;
    const otherViewerKey = [...vouchersQueryKey, 'customer-2'] as const;
    const activeVoucher = { id: 'voucher-1', isRedeemed: false };
    const otherVoucher = { id: 'voucher-1', isRedeemed: false };
    queryClient.setQueryData(activeViewerKey, [activeVoucher]);
    queryClient.setQueryData(otherViewerKey, [otherVoucher]);
    const { result } = renderHook(
      () => useVoucherOperations(setMutationError, 'customer-1'),
      { wrapper },
    );

    await act(async () => result.current.redeemVoucher('voucher-1'));

    expect(queryClient.getQueryData(activeViewerKey)).toEqual([
      { id: 'voucher-1', isRedeemed: true, redeemedBy: 'customer-1' },
    ]);
    expect(queryClient.getQueryData(otherViewerKey)).toEqual([otherVoucher]);
  });

  it('does not recreate voucher data for a viewer that changed during redeem', async () => {
    let resolveRedeem!: (value: {
      voucher: { id: string; isRedeemed: boolean; redeemedBy: string; code: string };
    }) => void;
    serviceMocks.redeem.mockReturnValueOnce(new Promise((resolve) => { resolveRedeem = resolve; }));
    let viewerKey = 'customer-1';
    const { result, rerender } = renderHook(
      () => useVoucherOperations(setMutationError, viewerKey),
      { wrapper },
    );

    let mutation!: Promise<void>;
    act(() => { mutation = result.current.redeemVoucher('voucher-1'); });
    viewerKey = 'customer-2';
    rerender();
    queryClient.removeQueries({ queryKey: vouchersQueryKey });
    const secondViewerVoucher = { id: 'public-voucher', isRedeemed: false };
    queryClient.setQueryData([...vouchersQueryKey, viewerKey], [secondViewerVoucher]);

    await act(async () => {
      resolveRedeem({
        voucher: {
          id: 'voucher-1',
          isRedeemed: true,
          redeemedBy: 'customer-1',
          code: 'PRIVATE-CODE',
        },
      });
      await mutation;
    });

    expect(queryClient.getQueriesData({ queryKey: vouchersQueryKey })).toEqual([
      [[...vouchersQueryKey, 'customer-2'], [secondViewerVoucher]],
    ]);
  });
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { createElement, type PropsWithChildren, type ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { offersQueryKey } from './useOffersQuery';
import { voucherQueryKeys, vouchersQueryKey } from './useVouchersQuery';
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
const redeemedVoucher = {
  id: 'voucher-1',
  sourceType: 'community' as const,
  platform: 'Google Pay' as const,
  title: 'Community reward',
  description: 'Shared reward',
  code: 'PRIVATE-CODE',
  imageUrl: 'https://example.com/voucher.png',
  donatedBy: 'customer-donor',
  donatedAt: new Date('2026-08-23T18:00:00.000Z'),
  isRedeemed: true,
  redeemedBy: 'customer-1',
  redeemedAt: new Date('2026-08-23T19:00:00.000Z'),
  reportCount: 0,
  isActive: true,
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

  it('prepends an absent redemption and refreshes only the initiating viewer history', async () => {
    const activeViewerKey = voucherQueryKeys.list('customer-1');
    const otherViewerKey = [...vouchersQueryKey, 'customer-2'] as const;
    const existingVoucher = { ...redeemedVoucher, id: 'existing-voucher', code: 'EXISTING-CODE' };
    const otherVoucher = { ...redeemedVoucher, redeemedBy: 'customer-2', code: 'OTHER-CODE' };
    serviceMocks.redeem.mockResolvedValueOnce({ voucher: redeemedVoucher });
    queryClient.setQueryData(activeViewerKey, [existingVoucher]);
    queryClient.setQueryData(otherViewerKey, [otherVoucher]);
    const { result } = renderHook(
      () => useVoucherOperations(setMutationError, 'customer-1'),
      { wrapper },
    );

    await act(async () => result.current.redeemVoucher('voucher-1'));

    expect(queryClient.getQueryData(activeViewerKey)).toEqual([redeemedVoucher, existingVoucher]);
    expect(queryClient.getQueryData(otherViewerKey)).toEqual([otherVoucher]);
    expect(invalidateQueries).toHaveBeenNthCalledWith(1, { queryKey: activeViewerKey });
    expect(invalidateQueries).toHaveBeenNthCalledWith(2, { queryKey: offersQueryKey });
    expect(invalidateQueries).toHaveBeenCalledTimes(2);
  });

  it('does not cache a redemption whose claimant differs from the initiating viewer', async () => {
    const activeViewerKey = voucherQueryKeys.list('customer-1');
    const availableVoucher = {
      ...redeemedVoucher,
      code: undefined,
      isRedeemed: false,
      redeemedBy: undefined,
      redeemedAt: undefined,
    };
    serviceMocks.redeem.mockResolvedValueOnce({
      voucher: { ...redeemedVoucher, redeemedBy: 'customer-2', code: 'OTHER-PRIVATE-CODE' },
    });
    queryClient.setQueryData(activeViewerKey, [availableVoucher]);
    const { result } = renderHook(
      () => useVoucherOperations(setMutationError, 'customer-1'),
      { wrapper },
    );

    await act(async () => result.current.redeemVoucher('voucher-1'));

    expect(queryClient.getQueryData(activeViewerKey)).toEqual([availableVoucher]);
  });

  it('does not recreate initiating viewer history after auth clears it', async () => {
    let resolveRedeem!: (value: { voucher: typeof redeemedVoucher }) => void;
    serviceMocks.redeem.mockReturnValueOnce(new Promise((resolve) => { resolveRedeem = resolve; }));
    const initiatingViewerKey = voucherQueryKeys.list('customer-1');
    queryClient.setQueryData(initiatingViewerKey, [redeemedVoucher]);
    const { result } = renderHook(
      () => useVoucherOperations(setMutationError, 'customer-1'),
      { wrapper },
    );

    let mutation!: Promise<void>;
    act(() => { mutation = result.current.redeemVoucher('voucher-1'); });
    queryClient.removeQueries({ queryKey: vouchersQueryKey });

    await act(async () => {
      resolveRedeem({ voucher: redeemedVoucher });
      await mutation;
    });

    expect(queryClient.getQueriesData({ queryKey: vouchersQueryKey })).toEqual([]);
  });

  it('does not restore cleared history or expose a late redemption after an account switch', async () => {
    let resolveRedeem!: (value: {
      voucher: typeof redeemedVoucher;
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
    const secondViewerVoucher = {
      ...redeemedVoucher,
      code: undefined,
      isRedeemed: false,
      redeemedBy: undefined,
      redeemedAt: undefined,
    };
    queryClient.setQueryData([...vouchersQueryKey, viewerKey], [secondViewerVoucher]);

    await act(async () => {
      resolveRedeem({ voucher: redeemedVoucher });
      await mutation;
    });

    expect(queryClient.getQueriesData({ queryKey: vouchersQueryKey })).toEqual([
      [[...vouchersQueryKey, 'customer-2'], [secondViewerVoucher]],
    ]);
  });
});

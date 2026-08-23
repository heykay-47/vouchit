import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Campaign, Invoice } from '@/lib/types';
import { offersQueryKey } from './useOffersQuery';
import { vouchersQueryKey } from './useVouchersQuery';
import { businessQueryKeys, useRecordSettlementMutation } from './useBusinessQueries';

const recordSettlement = vi.hoisted(() => vi.fn());
vi.mock('@/services/business.service', () => ({
  businessService: { recordSettlement },
}));

const invoice = { id: 'invoice-1' } as Invoice;
const campaign = { id: 'campaign-1' } as Campaign;

describe('useRecordSettlementMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recordSettlement.mockResolvedValue({ invoice, campaign });
  });

  it('invalidates campaign, invoice, voucher, and offer queries after settlement', async () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
    const wrapper = ({ children }: PropsWithChildren) => createElement(QueryClientProvider, { client: queryClient }, children);
    const { result } = renderHook(() => useRecordSettlementMutation(), { wrapper });

    result.current.mutate({
      id: invoice.id,
      input: {
        amountPaise: 10100,
        externalPaymentReference: 'BANK-001',
        externalPaymentDate: '2026-08-19T00:00:00.000Z',
      },
    });

    await waitFor(() => expect(invalidateQueries).toHaveBeenCalledTimes(5));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: businessQueryKeys.campaign(campaign.id) });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: businessQueryKeys.campaigns() });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: businessQueryKeys.invoices() });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: vouchersQueryKey });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: offersQueryKey });
  });
});

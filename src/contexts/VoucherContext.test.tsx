import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { VoucherProvider, useVouchers } from './VoucherContext';

const queryResult = vi.hoisted(() => ({
  data: undefined,
  isLoading: true,
  error: null,
  refetch: vi.fn(),
}));

vi.mock('@/hooks/useVouchersQuery', () => ({
  useVouchersQuery: () => queryResult,
}));

vi.mock('@/hooks/useVoucherOperations', () => ({
  useVoucherOperations: () => ({
    donateVoucher: vi.fn(),
    redeemVoucher: vi.fn(),
    reportVoucher: vi.fn(),
  }),
}));

function VoucherState() {
  const { filteredVouchers } = useVouchers();
  return <output data-testid="filtered-count">{filteredVouchers?.length ?? -1}</output>;
}

function Parent() {
  const [tick, setTick] = useState(0);
  return (
    <>
      <button type="button" onClick={() => setTick((value) => value + 1)}>rerender {tick}</button>
      <VoucherProvider>
        <VoucherState />
      </VoucherProvider>
    </>
  );
}

describe('VoucherProvider', () => {
  it('does not loop while the voucher query has no data yet', async () => {
    const queryClient = new QueryClient();
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <Parent />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'rerender 0' }));

    expect(screen.getByTestId('filtered-count')).toHaveTextContent('0');
  });
});

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Invoice } from '@/lib/types';
import BusinessInvoices from './BusinessInvoices';

const invoicesQuery = vi.hoisted(() => ({
  data: [] as Invoice[],
  isLoading: false,
  error: null as Error | null,
}));

vi.mock('@/hooks/useBusinessQueries', () => ({
  useBusinessInvoicesQuery: () => invoicesQuery,
  useRecordSettlementMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const invoice: Invoice = {
  id: 'invoice-1',
  campaignId: 'campaign-1',
  businessId: 'business-1',
  priceVersion: 'v1',
  currency: 'INR',
  baseFeePaise: 9900,
  perVoucherFeePaise: 200,
  quantity: 1,
  totalPaise: 10100,
  status: 'issued',
  issuedAt: new Date('2026-08-19T03:00:00.000Z'),
};

describe('BusinessInvoices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invoicesQuery.data = [invoice];
    invoicesQuery.isLoading = false;
    invoicesQuery.error = null;
  });

  it('lists immutable invoice summaries and links each campaign', () => {
    render(<MemoryRouter><BusinessInvoices /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'business invoices' })).toBeInTheDocument();
    expect(screen.getByText('₹101.00')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /campaign campaign-1/i })).toHaveAttribute(
      'href',
      '/business/campaigns/campaign-1',
    );
    expect(screen.getByRole('button', { name: 'record external payment' })).toBeInTheDocument();
  });
});

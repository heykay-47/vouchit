import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Invoice } from '@/lib/types';
import SettlementForm from './SettlementForm';

const recordSettlement = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useBusinessQueries', () => ({
  useRecordSettlementMutation: () => ({
    mutateAsync: recordSettlement,
    isPending: false,
  }),
}));

const issuedInvoice: Invoice = {
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
  issuedAt: new Date('2026-08-18T03:00:00.000Z'),
};

const paidInvoice: Invoice = {
  ...issuedInvoice,
  status: 'paid',
  paidAt: new Date('2026-08-19T06:00:00.000Z'),
  externalPaymentReference: 'BANK-001',
  externalPaymentDate: new Date('2026-08-19T00:00:00.000Z'),
};

describe('SettlementForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recordSettlement.mockResolvedValue({ invoice: paidInvoice, campaign: {} });
  });

  it('records the exact external amount without checkout language', async () => {
    const user = userEvent.setup();
    render(<SettlementForm invoice={issuedInvoice} />);

    await user.type(screen.getByLabelText('payment reference'), 'BANK-001');
    await user.type(screen.getByLabelText('payment date'), '2026-08-19');
    await user.click(screen.getByRole('button', { name: 'record external payment' }));

    expect(recordSettlement).toHaveBeenCalledWith({
      id: 'invoice-1',
      input: {
        amountPaise: issuedInvoice.totalPaise,
        externalPaymentReference: 'BANK-001',
        externalPaymentDate: '2026-08-19T00:00:00.000Z',
      },
    });
    expect(screen.queryByText(/pay now|processed|verified/i)).not.toBeInTheDocument();
    expect(await screen.findByText('BANK-001')).toBeInTheDocument();
    expect(screen.queryByLabelText('payment reference')).not.toBeInTheDocument();
  });
});

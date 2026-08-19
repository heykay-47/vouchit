import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Invoice } from '@/lib/types';
import CampaignInvoice from './CampaignInvoice';

const invoice: Invoice = {
  id: 'invoice-1',
  campaignId: 'campaign-1',
  businessId: 'business-1',
  priceVersion: 'v1',
  currency: 'INR',
  baseFeePaise: 9900,
  perVoucherFeePaise: 200,
  quantity: 3,
  totalPaise: 10500,
  status: 'issued',
  issuedAt: new Date('2026-08-19T03:00:00.000Z'),
};

describe('CampaignInvoice', () => {
  it('renders the server invoice formula and immutable pricing fields', () => {
    render(<CampaignInvoice invoice={invoice} />);

    expect(screen.getByRole('heading', { name: 'campaign invoice' })).toBeInTheDocument();
    expect(screen.getByText('₹99.00 + (₹2.00 × 3) = ₹105.00')).toBeInTheDocument();
    expect(screen.getByText('v1')).toBeInTheDocument();
    expect(screen.getByText('INR')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});

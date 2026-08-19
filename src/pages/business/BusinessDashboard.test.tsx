import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CampaignSummary, Invoice, User } from '@/lib/types';
import BusinessDashboard from './BusinessDashboard';

const campaignQuery = vi.hoisted(() => ({
  data: undefined as CampaignSummary[] | undefined,
  isLoading: false,
  error: null as Error | null,
}));
const invoiceQuery = vi.hoisted(() => ({
  data: [] as Invoice[],
  isLoading: false,
  error: null as Error | null,
}));

const business: User = {
  id: 'business-1',
  email: 'business@example.com',
  username: 'business',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  role: 'business',
  redeemedVouchers: [],
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: business }),
}));

vi.mock('@/hooks/useBusinessQueries', () => ({
  useBusinessCampaignsQuery: () => campaignQuery,
  useBusinessInvoicesQuery: () => invoiceQuery,
}));

const campaign = (id: string, title: string, status: CampaignSummary['campaign']['effectiveStatus'], analytics: CampaignSummary['analytics']): CampaignSummary => ({
  campaign: {
    id,
    businessId: 'business-1',
    businessProfileId: 'profile-1',
    organizationName: 'Fresh Market',
    title,
    brandName: 'Fresh Market',
    description: 'Offer',
    terms: 'One use',
    platform: 'Google Pay',
    category: 'Shopping',
    imageUrl: '',
    expiryDate: new Date('2026-09-01T00:00:00Z'),
    status,
    effectiveStatus: status,
    createdAt: new Date('2026-08-19T00:00:00Z'),
    updatedAt: new Date('2026-08-19T00:00:00Z'),
  },
  inventoryCount: analytics?.totalInventory ?? 0,
  invoice: null,
  analytics,
});

describe('BusinessDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    campaignQuery.data = [];
    invoiceQuery.data = [];
    campaignQuery.isLoading = false;
    invoiceQuery.isLoading = false;
    campaignQuery.error = null;
    invoiceQuery.error = null;
  });

  it('renders status counts, observed totals, and the new campaign action', () => {
    render(<MemoryRouter><BusinessDashboard /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'business dashboard' })).toBeInTheDocument();
    expect(screen.getByText(/welcome back, business/i)).toBeInTheDocument();
    expect(screen.getByText('campaign status')).toBeInTheDocument();
    expect(screen.getByText('aggregate views')).toBeInTheDocument();
    expect(screen.getByText('aggregate claims')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /new campaign/i })).toHaveAttribute('href', '/business/campaigns/new');
  });

  it('derives dashboard totals from campaign analytics and outstanding invoices', () => {
    campaignQuery.data = [
      campaign('campaign-1', 'Save on groceries', 'active', {
        totalInventory: 5,
        views: 12,
        claimedBeforeExpiry: 2,
        remaining: 3,
        expired: 0,
        deactivated: 0,
        claimRate: 0.4,
        feePerClaimPaise: 1000,
      }),
      campaign('campaign-2', 'Weekend rewards', 'draft', null),
    ];
    invoiceQuery.data = [{
      id: 'invoice-1',
      campaignId: 'campaign-1',
      businessId: 'business-1',
      priceVersion: 'v1',
      currency: 'INR',
      baseFeePaise: 9900,
      perVoucherFeePaise: 200,
      quantity: 5,
      totalPaise: 10900,
      status: 'issued',
      issuedAt: new Date('2026-08-19T00:00:00Z'),
    }];

    render(<MemoryRouter><BusinessDashboard /></MemoryRouter>);

    expect(screen.getByText('Save on groceries')).toBeInTheDocument();
    expect(screen.getByText('Weekend rewards')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('₹109.00')).toBeInTheDocument();
    expect(screen.getByText(/outstanding/i)).toBeInTheDocument();
    expect(screen.getByText(/recent invoices/i)).toBeInTheDocument();
    expect(screen.getByText(/1 campaign has no observed analytics/i)).toBeInTheDocument();
  });

  it('does not render observed zeroes when every campaign analytics value is unavailable', () => {
    campaignQuery.data = [campaign('campaign-1', 'Unpaid campaign', 'awaiting_payment', null)];

    render(<MemoryRouter><BusinessDashboard /></MemoryRouter>);

    expect(screen.getAllByText('not available')).toHaveLength(2);
    expect(screen.getByText('no campaigns have observed analytics')).toBeInTheDocument();
  });
});

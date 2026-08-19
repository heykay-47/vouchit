import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@/lib/types';
import BusinessDashboard from './BusinessDashboard';

const campaignQuery = vi.hoisted(() => ({
  data: undefined as { campaign: { id: string; title: string; status: string; effectiveStatus: string }; inventoryCount: number }[] | undefined,
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
}));

describe('BusinessDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a business workspace shell without fabricated metrics', () => {
    render(<MemoryRouter><BusinessDashboard /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'business dashboard' })).toBeInTheDocument();
    expect(screen.getByText(/welcome back, business/i)).toBeInTheDocument();
    expect(screen.queryByText(/total vouchers|revenue|claims|conversion/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /new campaign/i })).toHaveAttribute('href', '/business/campaigns/new');
  });

  it('lists server campaign statuses without adding analytics', () => {
    campaignQuery.data = [{
      campaign: {
        id: 'campaign-1',
        title: 'Save on groceries',
        status: 'draft',
        effectiveStatus: 'draft',
      },
      inventoryCount: 0,
    }];

    render(<MemoryRouter><BusinessDashboard /></MemoryRouter>);

    expect(screen.getByText('Save on groceries')).toBeInTheDocument();
    expect(screen.getByText('draft')).toBeInTheDocument();
    expect(screen.queryByText(/views|claim rate|remaining/i)).not.toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { CampaignSummary } from '@/lib/types';
import CampaignList from './CampaignList';

const campaigns: CampaignSummary[] = [
  {
    campaign: {
      id: 'campaign-1',
      businessId: 'business-1',
      businessProfileId: 'profile-1',
      organizationName: 'Fresh Market',
      title: 'Save on groceries',
      brandName: 'Fresh Market',
      description: 'A grocery offer',
      terms: 'One use',
      platform: 'Google Pay',
      category: 'Shopping',
      imageUrl: '',
      expiryDate: new Date('2026-09-01T00:00:00Z'),
      status: 'active',
      effectiveStatus: 'active',
      createdAt: new Date('2026-08-19T00:00:00Z'),
      updatedAt: new Date('2026-08-19T00:00:00Z'),
    },
    inventoryCount: 5,
    invoice: null,
    analytics: {
      totalInventory: 5,
      views: 12,
      claimedBeforeExpiry: 2,
      remaining: 3,
      expired: 0,
      deactivated: 0,
      claimRate: 0.4,
      feePerClaimPaise: 1000,
    },
  },
];

describe('CampaignList', () => {
  it('renders owned campaign summaries with status and observed claims', () => {
    render(<MemoryRouter><CampaignList campaigns={campaigns} /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'recent campaigns' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /save on groceries/i })).toHaveAttribute(
      'href',
      '/business/campaigns/campaign-1',
    );
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText(/5 inventory vouchers/i)).toBeInTheDocument();
    expect(screen.getByText(/2 claimed/i)).toBeInTheDocument();
  });

  it('renders a useful empty state', () => {
    render(<MemoryRouter><CampaignList campaigns={[]} /></MemoryRouter>);

    expect(screen.getByText(/no campaigns yet/i)).toBeInTheDocument();
  });
});

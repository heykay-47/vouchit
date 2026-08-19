import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CampaignAnalytics } from '@/lib/types';
import CampaignOutcomes from './CampaignOutcomes';

const analytics: CampaignAnalytics = {
  totalInventory: 10,
  views: 25,
  claimedBeforeExpiry: 4,
  remaining: 3,
  expired: 2,
  deactivated: 1,
  claimRate: 0.4,
  feePerClaimPaise: 2500,
};

describe('CampaignOutcomes', () => {
  it('renders direct observed outcomes and explains their boundaries', () => {
    render(<CampaignOutcomes analytics={analytics} />);

    expect(screen.getByRole('heading', { name: 'campaign outcomes' })).toBeInTheDocument();
    expect(screen.getByText('total inventory')).toBeInTheDocument();
    expect(screen.getAllByText('10')).toHaveLength(2);
    expect(screen.getByText('aggregate views')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('claimed before expiry')).toBeInTheDocument();
    expect(screen.getAllByText('4')).toHaveLength(2);
    expect(screen.getAllByText('remaining')).toHaveLength(2);
    expect(screen.getAllByText('3')).toHaveLength(2);
    expect(screen.getByText('expired')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('deactivated')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('claim rate')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(screen.getByText('fee per claim')).toBeInTheDocument();
    expect(screen.getByText('₹25.00')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'campaign outcome funnel' })).toHaveTextContent(/inventory.*claimed.*remaining/i);
    expect(screen.getByText(/aggregate detail opens/i)).toBeInTheDocument();
    expect(screen.getByText(/payment was recorded externally/i)).toBeInTheDocument();
  });

  it('renders unavailable when no claim fee can be observed', () => {
    render(<CampaignOutcomes analytics={{ ...analytics, feePerClaimPaise: 0 }} />);

    expect(screen.getByText('not available')).toBeInTheDocument();
  });
});

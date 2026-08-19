import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Voucher } from '@/lib/types';
import Browse from './Browse';

const mocks = vi.hoisted(() => ({
  vouchers: [] as Voucher[],
}));

vi.mock('@/contexts/VoucherContext', () => ({
  useVouchers: () => ({ vouchers: mocks.vouchers, isLoading: false }),
}));

vi.mock('@/components/VoucherCard', () => ({
  default: ({ voucher }: { voucher: Voucher }) => <article>{voucher.title}</article>,
}));

const communityVoucher = {
  id: 'community-1',
  sourceType: 'community',
  platform: 'Google Pay' as const,
  title: 'Community Food Reward',
  description: 'A community voucher',
  imageUrl: 'https://example.com/community.png',
  donatedBy: 'donor-1',
  donatedAt: new Date('2026-08-10T00:00:00Z'),
  isRedeemed: false,
  reportCount: 0,
  isActive: true,
} as Voucher;

const campaignVoucher = {
  ...communityVoucher,
  id: 'campaign-1',
  sourceType: 'campaign',
  title: 'Acme Weekend Reward',
  description: 'A campaign voucher',
  campaign: {
    campaignId: 'campaign-1',
    brandName: 'Acme Rewards',
    organizationName: 'Acme Offers',
  },
} as unknown as Voucher;

describe('Browse', () => {
  beforeEach(() => {
    mocks.vouchers = [communityVoucher, campaignVoucher];
  });

  it('lists campaign content beside community content and searches attribution', async () => {
    const user = userEvent.setup();
    render(<Browse />);

    expect(screen.getByText('2 vouchers found')).toBeInTheDocument();
    expect(screen.getByText('Community Food Reward')).toBeInTheDocument();
    expect(screen.getByText('Acme Weekend Reward')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('search...'), 'Acme Offers');

    expect(screen.getByText('1 vouchers found')).toBeInTheDocument();
    expect(screen.queryByText('Community Food Reward')).not.toBeInTheDocument();
    expect(screen.getByText('Acme Weekend Reward')).toBeInTheDocument();
  });
});

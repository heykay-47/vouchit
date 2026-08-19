import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Voucher } from '@/lib/types';
import { voucherService } from '@/services/voucher.service';
import VoucherGallery from './VoucherGallery';

const mocks = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  vouchers: [] as Voucher[],
}));

vi.mock('@/contexts/VoucherContext', () => ({
  useVouchers: () => ({ vouchers: mocks.vouchers, isLoading: false }),
}));

vi.mock('./VoucherCard', () => ({
  default: ({ voucher }: { voucher: Voucher }) => <article>{voucher.title}</article>,
}));

vi.mock('@/services/api-client', () => ({
  apiRequest: mocks.apiRequest,
}));

const baseVoucher = {
  id: 'voucher-1',
  platform: 'Google Pay' as const,
  title: 'Community Food Reward',
  description: 'A community voucher',
  imageUrl: 'https://example.com/voucher.png',
  donatedBy: 'donor-1',
  donatedAt: new Date('2026-08-10T00:00:00Z'),
  isRedeemed: false,
  reportCount: 0,
  isActive: true,
};

const campaignVoucher = {
  ...baseVoucher,
  id: 'campaign-voucher-1',
  title: 'Acme Weekend Reward',
  description: 'Business campaign voucher',
  sourceType: 'campaign',
  campaign: {
    campaignId: 'campaign-1',
    brandName: 'Acme Rewards',
    organizationName: 'Acme Offers',
  },
} as unknown as Voucher;

describe('VoucherGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.vouchers = [
      { ...baseVoucher, sourceType: 'community' } as Voucher,
      campaignVoucher,
    ];
  });

  it('keeps campaign and community vouchers in one searchable listing when code is absent', async () => {
    const user = userEvent.setup();
    render(<VoucherGallery />);

    expect(screen.getByText('Community Food Reward')).toBeInTheDocument();
    expect(screen.getByText('Acme Weekend Reward')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Search vouchers...'), 'acme offers');

    await waitFor(() => {
      expect(screen.queryByText('Community Food Reward')).not.toBeInTheDocument();
      expect(screen.getByText('Acme Weekend Reward')).toBeInTheDocument();
    });
  });

  it('normalizes legacy source and hydrates voucher dates from the service', async () => {
    mocks.apiRequest.mockResolvedValueOnce({
      vouchers: [{
        ...baseVoucher,
        donatedAt: '2026-08-10T00:00:00.000Z',
        expiryDate: '2026-08-20T00:00:00.000Z',
      }],
    });

    const [voucher] = await voucherService.list();

    expect(voucher.sourceType).toBe('community');
    expect(voucher.donatedAt).toBeInstanceOf(Date);
    expect(voucher.expiryDate).toBeInstanceOf(Date);
  });
});

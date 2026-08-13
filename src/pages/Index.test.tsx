import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Voucher } from '@/lib/types';
import Index from './Index';

const retryVouchers = vi.fn(async () => undefined);
const useVouchersMock = vi.fn();

const vouchers: Voucher[] = [
  {
    id: 'voucher-1',
    platform: 'Google Pay',
    title: 'Food Delivery Reward',
    description: 'Valid on your next order',
    code: '',
    imageUrl: 'https://example.com/food.png',
    value: 'INR 100',
    donatedBy: 'donor-1',
    donatedAt: new Date('2026-08-10T00:00:00Z'),
    isRedeemed: false,
    reportCount: 0,
    isActive: true,
  },
  {
    id: 'voucher-2',
    platform: 'PhonePe',
    title: 'Travel Reward',
    description: 'Valid on bus tickets',
    code: '',
    imageUrl: 'https://example.com/travel.png',
    donatedBy: 'donor-2',
    donatedAt: new Date('2026-08-11T00:00:00Z'),
    isRedeemed: false,
    reportCount: 0,
    isActive: true,
  },
];

vi.mock('@/contexts/VoucherContext', () => ({
  useVouchers: () => useVouchersMock(),
}));

vi.mock('@/components/VoucherCard', () => ({
  default: ({ voucher }: { voucher: Voucher }) => <div>{voucher.title}</div>,
}));

describe('Index', () => {
  beforeEach(() => {
    retryVouchers.mockClear();
    useVouchersMock.mockReset();
  });

  it('renders voucher skeletons while loading', () => {
    useVouchersMock.mockReturnValue({ vouchers: [], isLoading: true, loadError: null, retryVouchers });
    render(<Index />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('loading vouchers');
    expect(status.querySelector('.sr-only')).toHaveTextContent('loading vouchers');
    expect(status.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('renders a retryable load error', async () => {
    const user = userEvent.setup();
    useVouchersMock.mockReturnValue({ vouchers: [], isLoading: false, loadError: 'network error', retryVouchers });
    render(<Index />);
    expect(screen.getByRole('alert')).toHaveTextContent('unable to load vouchers');
    const retry = screen.getByRole('button', { name: 'try again' });
    expect(retry).toHaveClass('h-11');
    await user.click(retry);
    expect(retryVouchers).toHaveBeenCalledOnce();
  });

  it('renders the inventory-empty state separately from filtered-empty results', async () => {
    const user = userEvent.setup();
    useVouchersMock.mockReturnValue({ vouchers: [], isLoading: false, loadError: null, retryVouchers });
    const emptyView = render(<Index />);
    expect(screen.getByText('no vouchers available yet')).toBeInTheDocument();
    emptyView.unmount();

    useVouchersMock.mockReturnValue({ vouchers, isLoading: false, loadError: null, retryVouchers });
    render(<Index />);
    await user.type(screen.getByRole('searchbox', { name: 'search vouchers' }), 'no match');
    expect(screen.getByText('no vouchers match your search')).toBeInTheDocument();
    const clearSearch = screen.getByRole('button', { name: 'clear search' });
    expect(clearSearch).toHaveClass('h-11');
    await user.click(clearSearch);
    expect(screen.getByText('Food Delivery Reward')).toBeInTheDocument();
  });

  it('labels search and announces the filtered result count', async () => {
    const user = userEvent.setup();
    useVouchersMock.mockReturnValue({ vouchers, isLoading: false, loadError: null, retryVouchers });
    render(<Index />);
    const search = screen.getByRole('searchbox', { name: 'search vouchers' });
    expect(search).toHaveAttribute('type', 'search');
    expect(search).toHaveClass('h-11');
    await user.type(search, 'Food');
    expect(screen.getByRole('status')).toHaveTextContent('1 voucher found');
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import type { Voucher } from '@/lib/types';
import { AuthDialogProvider } from '@/contexts/AuthDialogContext';
import Sidebar from './Sidebar';
import VoucherCard from './VoucherCard';

const redeemVoucher = vi.fn();
const reportVoucher = vi.fn();
const retryVouchers = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    isLoading: false,
    user: null,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('@/contexts/VoucherContext', () => ({
  useVouchers: () => ({ redeemVoucher, reportVoucher, retryVouchers }),
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'dark', setTheme: vi.fn() }),
}));

const voucher: Voucher = {
  id: 'voucher-1',
  platform: 'Google Pay',
  title: 'Food Reward',
  description: 'Valid on one order',
  code: 'FOOD50',
  imageUrl: 'https://example.com/voucher.png',
  donatedBy: 'donor-1',
  donatedAt: new Date('2026-08-10T00:00:00Z'),
  isRedeemed: false,
  reportCount: 0,
  isActive: true,
};

function renderWithAuth(ui: React.ReactNode) {
  return render(
    <BrowserRouter>
      <AuthDialogProvider>{ui}</AuthDialogProvider>
    </BrowserRouter>,
  );
}

describe('dialog-to-auth handoff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  it('waits for the drawer closing boundary, focuses auth, then returns to the menu button', async () => {
    const user = userEvent.setup();
    renderWithAuth(<Sidebar />);

    const menu = screen.getByRole('button', { name: 'open menu' });
    await user.click(menu);
    await user.click(screen.getByRole('button', { name: 'log in' }));

    const email = await screen.findByRole('textbox', { name: 'email' });
    expect(screen.queryByRole('dialog', { name: 'vouchit navigation' })).not.toBeInTheDocument();
    await waitFor(() => expect(email).toHaveFocus());

    await user.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(menu).toHaveFocus());
  });

  it('waits for voucher details to close, focuses auth, then returns to the voucher card', async () => {
    const user = userEvent.setup();
    renderWithAuth(<VoucherCard voucher={voucher} />);

    const card = screen.getByRole('button', { name: /Food Reward.*view details/ });
    await user.click(card);
    await user.click(screen.getByRole('button', { name: 'sign in to redeem' }));

    const email = await screen.findByRole('textbox', { name: 'email' });
    expect(screen.queryByText('sign in to view details')).not.toBeInTheDocument();
    await waitFor(() => expect(email).toHaveFocus());

    await user.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(card).toHaveFocus());
  });
});

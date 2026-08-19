import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Voucher } from '@/lib/types';
import { ApiClientError } from '@/services/api-client';
import VoucherCard from './VoucherCard';

const mocks = vi.hoisted(() => ({
  openLogin: vi.fn(),
  redeemVoucher: vi.fn(),
  reportVoucher: vi.fn(),
  retryVouchers: vi.fn(),
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
  logger: {
    error: vi.fn(),
  },
  useAuth: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mocks.useAuth(),
}));

vi.mock('@/contexts/VoucherContext', () => ({
  useVouchers: () => ({
    redeemVoucher: mocks.redeemVoucher,
    reportVoucher: mocks.reportVoucher,
    retryVouchers: mocks.retryVouchers,
  }),
}));

vi.mock('@/contexts/AuthDialogContext', () => ({
  useAuthDialog: () => ({ openLogin: mocks.openLogin }),
}));

vi.mock('@/utils/toast', () => ({ toast: mocks.toast }));
vi.mock('@/utils/logger', () => ({ logger: mocks.logger }));

const voucher: Voucher = {
  id: 'voucher-1',
  platform: 'Google Pay',
  title: '50% Off First Order',
  description: 'Valid on Food Delivery',
  code: 'WELCOME50',
  imageUrl: 'https://example.com/voucher.png',
  expiryDate: new Date('2026-08-20T00:00:00Z'),
  value: 'INR 100',
  donatedBy: 'donor-1',
  donatedAt: new Date('2026-08-10T00:00:00Z'),
  isRedeemed: false,
  reportCount: 0,
  isActive: true,
};

const campaignVoucher = {
  ...voucher,
  id: 'campaign-voucher-1',
  title: 'Business Weekend Reward',
  sourceType: 'campaign',
  code: 'CAMPAIGN50',
  campaign: {
    campaignId: 'campaign-1',
    brandName: 'Acme Rewards',
    organizationName: 'Acme Offers',
  },
} as unknown as Voucher;

const authenticatedUser = {
  id: 'user-1',
  email: 'user@example.com',
  username: 'user',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  redeemedVouchers: [],
  role: 'customer' as const,
};

function setupUser() {
  return userEvent.setup();
}

function deferredPromise() {
  let resolve!: () => void;
  const promise = new Promise<void>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}

describe('VoucherCard', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-08-13T12:00:00Z'));
    vi.clearAllMocks();
    mocks.useAuth.mockReturnValue({ isAuthenticated: false, user: null });
    mocks.redeemVoucher.mockResolvedValue(undefined);
    mocks.reportVoucher.mockResolvedValue(undefined);
    mocks.retryVouchers.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('opens from one semantic card button and preserves voucher-provided casing', async () => {
    const user = setupUser();
    render(<VoucherCard voucher={voucher} />);

    const trigger = screen.getByRole('button', {
      name: '50% Off First Order, Google Pay, available, view details',
    });
    expect(trigger).toHaveTextContent('50% Off First Order');
    expect(trigger).toHaveTextContent('Valid on Food Delivery');

    await user.tab();
    expect(trigger).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('attributes campaign supply without changing community cards', async () => {
    const user = setupUser();
    const communityVoucher = { ...voucher, sourceType: 'community' } as Voucher;
    render(<><VoucherCard voucher={campaignVoucher} /><VoucherCard voucher={communityVoucher} /></>);

    expect(screen.getByText('business campaign')).toBeInTheDocument();
    expect(screen.getByText('Acme Offers')).toBeInTheDocument();
    expect(screen.getByText('Acme Rewards')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /view details/i })).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: /Business Weekend Reward.*view details/ }));
    expect(screen.getByRole('dialog')).toHaveTextContent('business campaign');
    expect(screen.getByRole('dialog')).toHaveTextContent('Acme Offers');
    expect(screen.getByRole('dialog')).toHaveTextContent('Acme Rewards');
  });

  it('includes campaign attribution in the card accessible name', () => {
    render(<VoucherCard voucher={campaignVoucher} />);

    expect(screen.getByRole('button', {
      name: 'Business Weekend Reward, Google Pay, business campaign, Acme Offers, Acme Rewards, available, view details',
    })).toBeInTheDocument();
  });

  it('wraps long campaign attribution names in the card and dialog', async () => {
    const user = setupUser();
    const longOrganizationName = 'Organization'.repeat(20);
    const longBrandName = 'Brand'.repeat(20);
    const longCampaignVoucher = {
      ...campaignVoucher,
      campaign: {
        campaignId: 'campaign-1',
        brandName: longBrandName,
        organizationName: longOrganizationName,
      },
    } as unknown as Voucher;
    render(<VoucherCard voucher={longCampaignVoucher} />);

    expect(screen.getByText(longOrganizationName)).toHaveClass('min-w-0', 'break-words');
    expect(screen.getByText(longBrandName)).toHaveClass('min-w-0', 'break-words');

    await user.click(screen.getByRole('button', { name: /Business Weekend Reward.*view details/ }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(longOrganizationName)).toHaveClass('min-w-0', 'break-words');
    expect(within(dialog).getByText(longBrandName)).toHaveClass('min-w-0', 'break-words');
  });

  it('masks a campaign code when the client does not receive it', async () => {
    const user = setupUser();
    render(<VoucherCard voucher={{ ...campaignVoucher, code: undefined } as unknown as Voucher} />);

    await user.click(screen.getByRole('button', { name: /view details$/ }));

    expect(screen.getByText('••••••••')).toBeInTheDocument();
    expect(screen.queryByText('CAMPAIGN50')).not.toBeInTheDocument();
  });

  it('restores trigger focus on close and reopens with Space', async () => {
    const user = setupUser();
    render(<VoucherCard voucher={voucher} />);

    const trigger = screen.getByRole('button', {
      name: '50% Off First Order, Google Pay, available, view details',
    });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(trigger).toHaveFocus();

    await user.keyboard(' ');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('protects voucher content and hands unauthenticated redemption to login', async () => {
    const user = setupUser();
    render(<VoucherCard voucher={voucher} />);

    await user.click(screen.getByRole('button', {
      name: '50% Off First Order, Google Pay, available, view details',
    }));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByText(voucher.code)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'sign in to redeem' }));
    await waitFor(() => expect(mocks.openLogin).toHaveBeenCalledOnce());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mocks.redeemVoucher).not.toHaveBeenCalled();
  });

  it.each([
    ['expired', { expiryDate: new Date('2026-08-01T00:00:00Z') }, 'this voucher has expired'],
    ['reported', { isActive: false }, 'this voucher is unavailable'],
    ['redeemed', { isRedeemed: true }, 'this voucher has already been redeemed'],
  ])('explains why an unauthenticated %s voucher cannot be redeemed', async (_state, updates, message) => {
    const user = setupUser();
    render(<VoucherCard voucher={{ ...voucher, ...updates }} />);

    await user.click(screen.getByRole('button', { name: /view details$/ }));
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'sign in to redeem' })).not.toBeInTheDocument();
  });

  it('replaces a failed authenticated image while retaining its frame', async () => {
    const user = setupUser();
    mocks.useAuth.mockReturnValue({ isAuthenticated: true, user: authenticatedUser });
    render(<VoucherCard voucher={voucher} />);

    await user.click(screen.getByRole('button', { name: /view details$/ }));
    fireEvent.error(screen.getByRole('img', {
      name: '50% Off First Order voucher from Google Pay',
    }));

    const fallback = screen.getByText('voucher image unavailable');
    expect(fallback.parentElement).toHaveClass('aspect-video');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('reports clipboard failure without reporting success', async () => {
    const user = setupUser();
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    mocks.useAuth.mockReturnValue({ isAuthenticated: true, user: authenticatedUser });
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    render(<VoucherCard voucher={voucher} />);

    await user.click(screen.getByRole('button', { name: /view details$/ }));
    await user.click(screen.getByRole('button', { name: /WELCOME50/ }));

    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith('failed to copy code'));
    expect(mocks.toast.success).not.toHaveBeenCalledWith('code copied');
    expect(mocks.logger.error).toHaveBeenCalledWith(
      'Error copying voucher code',
      expect.any(Error),
      expect.objectContaining({ voucherId: voucher.id }),
    );
  });

  it('keeps long voucher details inside shrinkable wrapping regions', async () => {
    const user = setupUser();
    const longTitle = 'A'.repeat(160);
    const longCode = 'B'.repeat(160);
    const longValue = 'C'.repeat(160);
    const longDescription = 'D'.repeat(320);
    mocks.useAuth.mockReturnValue({ isAuthenticated: true, user: authenticatedUser });
    render(
      <VoucherCard
        voucher={{
          ...voucher,
          title: longTitle,
          code: longCode,
          value: longValue,
          description: longDescription,
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: /view details$/ }));
    const dialog = screen.getByRole('dialog');

    expect(within(dialog).getByRole('heading', { name: longTitle })).toHaveClass('break-words');
    expect(within(dialog).getByText(longCode)).toHaveClass('break-all', 'min-h-11');
    expect(within(dialog).getByText(longCode)).toHaveAccessibleName(`copy code ${longCode}`);
    expect(within(dialog).getByText(longValue)).toHaveClass('break-words');
    expect(within(dialog).getByText(longDescription)).toHaveClass('break-words');
  });

  it('hides text-redundant dialog icons from assistive technology', async () => {
    const user = setupUser();
    mocks.useAuth.mockReturnValue({ isAuthenticated: true, user: authenticatedUser });
    render(<VoucherCard voucher={{ ...voucher, reportCount: 1 }} />);

    await user.click(screen.getByRole('button', { name: /view details$/ }));

    const icons = screen.getByRole('dialog').querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(0);
    icons.forEach((icon) => expect(icon).toHaveAttribute('aria-hidden', 'true'));
  });

  it('prevents a second redemption while the first request is pending', async () => {
    const user = setupUser();
    const pending = deferredPromise();
    mocks.useAuth.mockReturnValue({ isAuthenticated: true, user: authenticatedUser });
    mocks.redeemVoucher.mockReturnValue(pending.promise);
    render(<VoucherCard voucher={voucher} />);

    await user.click(screen.getByRole('button', { name: /view details$/ }));
    await user.click(screen.getByRole('button', { name: 'redeem voucher' }));
    const pendingButton = screen.getByRole('button', { name: 'redeeming…' });
    expect(pendingButton).toBeDisabled();
    expect(pendingButton).toHaveClass('min-h-11');

    await user.click(pendingButton);
    expect(mocks.redeemVoucher).toHaveBeenCalledOnce();

    pending.resolve();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('prevents a second report while the first request is pending', async () => {
    const user = setupUser();
    const pending = deferredPromise();
    const redeemedVoucher: Voucher = {
      ...voucher,
      isRedeemed: true,
      redeemedBy: authenticatedUser.id,
    };
    mocks.useAuth.mockReturnValue({ isAuthenticated: true, user: authenticatedUser });
    mocks.reportVoucher.mockReturnValue(pending.promise);
    render(<VoucherCard voucher={redeemedVoucher} />);

    await user.click(screen.getByRole('button', { name: /view details$/ }));
    await user.click(screen.getByRole('button', { name: 'not working' }));
    const pendingButton = screen.getByRole('button', { name: 'reporting…' });
    expect(pendingButton).toBeDisabled();
    expect(pendingButton).toHaveClass('min-h-11');

    await user.click(pendingButton);
    expect(mocks.reportVoucher).toHaveBeenCalledOnce();

    pending.resolve();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('keeps failed redemption in context and re-enables its action', async () => {
    const user = setupUser();
    mocks.useAuth.mockReturnValue({ isAuthenticated: true, user: authenticatedUser });
    mocks.redeemVoucher.mockRejectedValue(new Error('network failure'));
    render(<VoucherCard voucher={voucher} />);

    await user.click(screen.getByRole('button', { name: /view details$/ }));
    await user.click(screen.getByRole('button', { name: 'redeem voucher' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'redeem voucher' })).toBeEnabled();
  });

  it('turns a stale redemption conflict unavailable and refreshes after the dialog closes', async () => {
    const user = setupUser();
    mocks.useAuth.mockReturnValue({ isAuthenticated: true, user: authenticatedUser });
    mocks.redeemVoucher.mockRejectedValue(new ApiClientError('Voucher already redeemed', 409));
    render(<VoucherCard voucher={voucher} />);

    await user.click(screen.getByRole('button', { name: /view details$/ }));
    await user.click(screen.getByRole('button', { name: 'redeem voucher' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('this voucher is no longer available')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'redeem voucher' })).not.toBeInTheDocument();
    expect(mocks.retryVouchers).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(mocks.retryVouchers).toHaveBeenCalledOnce();
  });

  it('keeps failed reports in context and closes only after a successful retry', async () => {
    const user = setupUser();
    const redeemedVoucher: Voucher = {
      ...voucher,
      isRedeemed: true,
      redeemedBy: authenticatedUser.id,
    };
    mocks.useAuth.mockReturnValue({ isAuthenticated: true, user: authenticatedUser });
    mocks.reportVoucher.mockRejectedValueOnce(new Error('network failure')).mockResolvedValueOnce(undefined);
    render(<VoucherCard voucher={redeemedVoucher} />);

    await user.click(screen.getByRole('button', { name: /view details$/ }));
    expect(screen.getByText('this voucher has already been redeemed')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'not working' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'not working' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'not working' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it.each([
    ['expired', { expiryDate: new Date('2026-08-01T00:00:00Z') }, 'this voucher has expired'],
    ['reported', { isActive: false }, 'this voucher is unavailable'],
    ['redeemed', { isRedeemed: true }, 'this voucher has already been redeemed'],
    ['donor-owned', { donatedBy: authenticatedUser.id }, 'you donated this voucher'],
  ])('explains why a %s voucher cannot be redeemed', async (_state, updates, message) => {
    const user = setupUser();
    mocks.useAuth.mockReturnValue({ isAuthenticated: true, user: authenticatedUser });
    render(<VoucherCard voucher={{ ...voucher, ...updates }} />);

    await user.click(screen.getByRole('button', { name: /view details$/ }));
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('retains business voucher inspection without customer action controls', async () => {
    const user = setupUser();
    const businessUser = { ...authenticatedUser, id: 'business-1', role: 'business' as const };
    mocks.useAuth.mockReturnValue({ isAuthenticated: true, user: businessUser });
    render(<VoucherCard voucher={campaignVoucher} />);

    await user.click(screen.getByRole('button', { name: /view details$/ }));

    expect(screen.getByText('••••••••')).toBeInTheDocument();
    expect(screen.queryByText(campaignVoucher.code as string)).not.toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByText('business campaign')).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByText('Acme Offers')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'redeem voucher' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'sign in to redeem' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'not working' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'worked' })).not.toBeInTheDocument();
  });

  it('suppresses business report controls on an owned redeemed voucher', async () => {
    const user = setupUser();
    const businessUser = { ...authenticatedUser, id: 'business-1', role: 'business' as const };
    mocks.useAuth.mockReturnValue({ isAuthenticated: true, user: businessUser });
    render(<VoucherCard voucher={{ ...voucher, isRedeemed: true, redeemedBy: businessUser.id }} />);

    await user.click(screen.getByRole('button', { name: /view details$/ }));

    expect(screen.queryByRole('button', { name: 'not working' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'worked' })).not.toBeInTheDocument();
  });
});

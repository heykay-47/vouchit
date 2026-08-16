import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import type { Voucher } from '@/lib/types';
import Index, { getAvailableVoucherCount } from './Index';

const landingState = vi.hoisted(() => ({
  isAuthenticated: false,
  isDesktop: false,
  isInView: true,
  isLoading: false,
  loadError: null as string | null,
  navigate: vi.fn(),
  openLogin: vi.fn(),
  reducedMotion: false,
  vouchers: [] as Voucher[],
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: landingState.isAuthenticated }),
}));

vi.mock('@/contexts/AuthDialogContext', () => ({
  useAuthDialog: () => ({ openLogin: landingState.openLogin }),
}));

vi.mock('@/contexts/VoucherContext', () => ({
  useVouchers: () => ({
    vouchers: landingState.vouchers,
    isLoading: landingState.isLoading,
    loadError: landingState.loadError,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => landingState.navigate };
});

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return {
    ...actual,
    useInView: () => landingState.isInView,
    useReducedMotion: () => landingState.reducedMotion,
  };
});

vi.stubGlobal('IntersectionObserver', class {
  observe() {}
  unobserve() {}
  disconnect() {}
});

function renderLanding(overrides: Partial<typeof landingState> = {}) {
  Object.assign(landingState, overrides);
  return render(
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Index />
    </BrowserRouter>,
  );
}

describe('Index', () => {
  beforeEach(() => {
    landingState.isAuthenticated = false;
    landingState.isDesktop = false;
    landingState.isInView = true;
    landingState.isLoading = false;
    landingState.loadError = null;
    landingState.reducedMotion = false;
    landingState.navigate.mockReset();
    landingState.openLogin.mockReset();
    landingState.vouchers = [];
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(min-width: 560px)' && landingState.isDesktop,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it('explains the exchange and exposes the primary action in the first viewport', () => {
    renderLanding();

    expect(screen.getByRole('heading', { level: 1, name: "good vouchers shouldn't go unused." })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'browse vouchers' })[0]).toHaveAttribute('href', '/browse');
    const board = screen.getByRole('region', { name: 'how a voucher moves through vouchit' });
    expect(board).toHaveClass('exchange-board--first-viewport');
    expect(board).toHaveAttribute('data-first-viewport', 'true');
    expect(within(board).getAllByRole('listitem')).toHaveLength(3);
    expect(within(board).getByText('donated')).toBeInTheDocument();
    expect(within(board).getByText('shared by a community member')).toBeInTheDocument();
    expect(within(board).getByText('available')).toBeInTheDocument();
    expect(within(board).getByText('ready for someone who can use it')).toBeInTheDocument();
    expect(within(board).getByText('claimed')).toBeInTheDocument();
    expect(within(board).getByText('reserved for its claimant')).toBeInTheDocument();
  });

  it('states the expiry deadline once instead of repeating it in claimed copy', () => {
    renderLanding();

    const board = screen.getByRole('region', { name: 'how a voucher moves through vouchit' });
    expect(within(board).getAllByText(/before expiry/i)).toHaveLength(1);
  });

  it.each([
    { isLoading: true, loadError: null, vouchers: [] },
    { isLoading: false, loadError: 'offline', vouchers: [] },
    { isLoading: false, loadError: null, vouchers: [] },
  ])('omits availability proof for $isLoading/$loadError', (state) => {
    renderLanding(state);

    expect(screen.queryByText(/available right now/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'browse vouchers' })).toHaveLength(2);
  });

  it('shows only active, unredeemed, unexpired vouchers in closing proof', () => {
    const now = new Date('2026-08-15T12:00:00.000Z');
    const voucher = (overrides: Partial<Voucher>): Voucher => ({
      id: 'voucher-id',
      platform: 'Other',
      title: 'A useful voucher',
      description: 'A voucher description',
      code: 'protected-code',
      imageUrl: '/voucher.png',
      expiryDate: new Date('2099-08-20T12:00:00.000Z'),
      value: '₹100',
      donatedBy: 'donor-id',
      donatedAt: now,
      isRedeemed: false,
      reportCount: 0,
      isActive: true,
      ...overrides,
    });

    renderLanding({
      isLoading: false,
      loadError: null,
      vouchers: [
        voucher({ id: 'active' }),
        voucher({ id: 'redeemed', isRedeemed: true }),
        voucher({ id: 'expired', expiryDate: new Date('2000-08-14T12:00:00.000Z') }),
      ],
    });

    expect(screen.getByText('1 voucher available right now')).toBeInTheDocument();
  });

  it('counts no-expiry and boundary-expiry vouchers while excluding inactive vouchers', () => {
    const now = new Date('2026-08-15T12:00:00.000Z');
    const voucher = (overrides: Partial<Voucher>): Voucher => ({
      id: 'voucher-id',
      platform: 'Other',
      title: 'A useful voucher',
      description: 'A voucher description',
      code: 'protected-code',
      imageUrl: '/voucher.png',
      value: '₹100',
      donatedBy: 'donor-id',
      donatedAt: now,
      isRedeemed: false,
      reportCount: 0,
      isActive: true,
      ...overrides,
    });

    expect(getAvailableVoucherCount([
      voucher({ id: 'no-expiry' }),
      voucher({ id: 'expires-now', expiryDate: now }),
      voucher({ id: 'inactive', isActive: false }),
    ], now)).toBe(2);
  });

  it('keeps trust facts factual and avoids unsupported claims', () => {
    renderLanding();

    const trust = screen.getByRole('region', { name: 'how exchange stays accountable' });
    expect(within(trust).getByText(/protected code/i)).toBeInTheDocument();
    expect(within(trust).getByText(/one claim/i)).toBeInTheDocument();
    expect(within(trust).getByText(/donors cannot claim/i)).toBeInTheDocument();
    expect(within(trust).getByText(/report/i)).toBeInTheDocument();
    expect(trust.textContent).not.toMatch(/verified|guaranteed|no tracking|merchant partner/i);
  });

  it('connects the three exchange steps with responsive list semantics', () => {
    renderLanding();

    const walkthrough = screen.getByRole('region', { name: 'how to exchange a voucher' });
    const geometry = within(walkthrough).getByTestId('exchange-walkthrough-geometry');
    const steps = within(geometry).getByRole('list', { name: 'vouchit exchange steps' });

    expect(geometry).toHaveAttribute('data-path-geometry', 'stage-centers');
    expect(within(geometry).getByTestId('exchange-walkthrough-path')).toBeInTheDocument();
    expect(within(geometry).getByTestId('exchange-walkthrough-progress')).toBeInTheDocument();
    expect(steps).toBeInTheDocument();
    expect(within(steps).getAllByRole('listitem')).toHaveLength(3);
    expect(within(steps).getByText("sign in to share a wallet voucher you won't use")).toBeInTheDocument();
    expect(within(steps).getByText('browse active vouchers without an account')).toBeInTheDocument();
    expect(within(steps).getByText('sign in, claim once, and receive the protected details')).toBeInTheDocument();
  });

  it('draws the walkthrough line while activating donate, discover, then claim', () => {
    vi.useFakeTimers();

    try {
      renderLanding();

      const geometry = screen.getByTestId('exchange-walkthrough-geometry');
      const steps = within(geometry).getAllByRole('listitem');
      const progress = within(geometry).getByTestId('exchange-walkthrough-progress');

      expect(geometry).toHaveAttribute('data-motion-sequence', 'donate discover claim');
      expect(progress).toHaveAttribute('data-current-step', 'donate');
      expect(steps.map((step) => step.getAttribute('data-state'))).toEqual(['current', 'upcoming', 'upcoming']);

      act(() => vi.advanceTimersByTime(700));
      expect(progress).toHaveAttribute('data-current-step', 'discover');
      expect(steps.map((step) => step.getAttribute('data-state'))).toEqual(['reached', 'current', 'upcoming']);

      act(() => vi.advanceTimersByTime(700));
      expect(progress).toHaveAttribute('data-current-step', 'claim');
      expect(steps.map((step) => step.getAttribute('data-state'))).toEqual(['reached', 'reached', 'current']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('includes the browse closing action and minimal footer links', () => {
    renderLanding();

    expect(screen.getAllByRole('link', { name: 'browse vouchers' })).toHaveLength(2);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toHaveAttribute('data-layout', 'responsive');
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByRole('link', { name: 'community' })).toHaveAttribute('href', '/community');
    expect(within(footer).getByRole('link', { name: 'about' })).toHaveAttribute('href', '/about');
    expect(within(footer).getByRole('link', { name: 'vouchit repository' })).toHaveAttribute('href', 'https://github.com/heykay-47/vouchit.git');
  });

  it('keeps footer links aligned to the 44px touch-target contract', () => {
    renderLanding();

    const footerLinks = within(screen.getByRole('contentinfo')).getAllByRole('link');
    expect(footerLinks).toHaveLength(4);
    footerLinks.forEach((link) => {
      expect(link).toHaveClass('landing-footer__link', 'min-h-11');
    });
  });

  it('includes community in the landing header navigation', () => {
    renderLanding();

    expect(within(screen.getByRole('navigation', { name: 'primary navigation' }))
      .getByRole('link', { name: 'community' }))
      .toHaveAttribute('href', '/community');
  });

  it('states that browsing is public while donation and claiming require authentication', () => {
    renderLanding();

    const walkthrough = screen.getByRole('region', { name: 'how to exchange a voucher' });
    expect(within(walkthrough).getByText('browsing is public; donating and claiming require authentication.')).toBeInTheDocument();
    expect(within(walkthrough).getByText("sign in to share a wallet voucher you won't use")).toBeInTheDocument();
  });

  it('uses neutral hover treatments for landing navigation and actions', () => {
    renderLanding();

    expect(screen.getByRole('button', { name: 'log in' })).toHaveClass('hover:bg-muted', 'hover:text-foreground');
    expect(screen.getByRole('button', { name: 'donate yours' })).toHaveClass('hover:bg-muted', 'hover:text-foreground');
    expect(within(screen.getByRole('navigation', { name: 'primary navigation' }))
      .getByRole('link', { name: 'browse' }))
      .toHaveClass('hover:bg-muted', 'hover:text-foreground');
  });

  it('continues to donate after successful authentication', async () => {
    const user = userEvent.setup();
    landingState.openLogin.mockImplementation((_focus: HTMLElement, onAuthenticated?: () => void) => onAuthenticated?.());
    renderLanding();

    await user.click(screen.getByRole('button', { name: 'donate yours' }));

    expect(landingState.openLogin).toHaveBeenCalledOnce();
    expect(landingState.navigate).toHaveBeenCalledWith('/donate');
  });

  it('navigates authenticated donors directly to donation', async () => {
    const user = userEvent.setup();
    renderLanding({ isAuthenticated: true });

    await user.click(screen.getByRole('button', { name: 'donate yours' }));

    expect(landingState.navigate).toHaveBeenCalledWith('/donate');
    expect(landingState.openLogin).not.toHaveBeenCalled();
  });

  it('exposes mobile navigation semantics and closes on Escape or link activation', async () => {
    const user = userEvent.setup();
    renderLanding();

    const menu = screen.getByRole('button', { name: 'open navigation' });
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    expect(menu).toHaveAttribute('aria-controls', 'landing-navigation');
    expect(menu).toHaveClass('min-h-11', 'min-w-11', 'md:hidden');
    expect(menu).not.toHaveClass('lg:hidden');

    await user.click(menu);

    expect(screen.getByRole('button', { name: 'close navigation' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('navigation', { name: 'primary navigation' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'open navigation' })).toHaveAttribute('aria-expanded', 'false');

    await user.click(screen.getByRole('button', { name: 'open navigation' }));
    await user.click(within(screen.getByRole('navigation', { name: 'primary navigation' })).getByRole('link', { name: 'browse' }));
    expect(screen.getByRole('button', { name: 'open navigation' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps the exchange sequence visible as discrete changes when reduced motion is requested', () => {
    vi.useFakeTimers();

    try {
      renderLanding({ reducedMotion: true });

      const marker = screen.getByTestId('exchange-marker');
      const connector = screen.getByTestId('exchange-connector');
      const walkthrough = screen.getByTestId('exchange-walkthrough-progress');

      expect(marker).toHaveAttribute('data-motion-state', 'reduced');
      expect(connector).toHaveAttribute('data-motion-state', 'reduced');
      expect(marker).toHaveAttribute('data-current-stage', 'donated');
      expect(walkthrough).toHaveAttribute('data-current-step', 'donate');

      act(() => vi.advanceTimersByTime(700));
      expect(marker).toHaveAttribute('data-current-stage', 'available');
      expect(walkthrough).toHaveAttribute('data-current-step', 'discover');

      act(() => vi.advanceTimersByTime(700));
      expect(marker).toHaveAttribute('data-current-stage', 'claimed');
      expect(walkthrough).toHaveAttribute('data-current-step', 'claim');
    } finally {
      vi.useRealTimers();
    }
  });

  it('progresses the marker through all stage centers on the desktop track', () => {
    renderLanding({ isDesktop: true });

    const marker = screen.getByTestId('exchange-marker');
    expect(marker).toHaveAttribute('data-motion-axis', 'horizontal');
    expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 560px)');
    expect(marker).toHaveAttribute('data-motion-stages', 'donated available claimed');
    expect(screen.getByTestId('exchange-track')).toHaveClass('exchange-board__track');
    expect(within(screen.getByTestId('exchange-track')).getAllByRole('listitem').map((stage) => stage.getAttribute('data-stage'))).toEqual([
      'donated',
      'available',
      'claimed',
    ]);
  });

  it('activates donated, available, then claimed after the board enters view', () => {
    vi.useFakeTimers();

    try {
      renderLanding({ isDesktop: true });

      const marker = screen.getByTestId('exchange-marker');
      const stages = within(screen.getByTestId('exchange-track')).getAllByRole('listitem');

      expect(marker).toHaveAttribute('data-current-stage', 'donated');
      expect(stages.map((stage) => stage.getAttribute('data-state'))).toEqual(['current', 'upcoming', 'upcoming']);

      act(() => vi.advanceTimersByTime(700));
      expect(marker).toHaveAttribute('data-current-stage', 'available');
      expect(stages.map((stage) => stage.getAttribute('data-state'))).toEqual(['reached', 'current', 'upcoming']);

      act(() => vi.advanceTimersByTime(700));
      expect(marker).toHaveAttribute('data-current-stage', 'claimed');
      expect(stages.map((stage) => stage.getAttribute('data-state'))).toEqual(['reached', 'reached', 'current']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('uses the vertical track geometry below the desktop breakpoint', () => {
    renderLanding({ isDesktop: false });

    expect(screen.getByTestId('exchange-track')).toHaveAttribute('data-rail-side', 'inline-end');
    expect(screen.getByTestId('exchange-marker')).toHaveAttribute('data-motion-axis', 'vertical');
    expect(screen.getByTestId('exchange-connector')).toHaveAttribute('data-motion-axis', 'vertical');
  });
});

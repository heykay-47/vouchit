import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import type { Voucher } from '@/lib/types';
import Index from './Index';

const landingState = vi.hoisted(() => ({
  isAuthenticated: false,
  isDesktop: false,
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
  return { ...actual, useReducedMotion: () => landingState.reducedMotion };
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
    landingState.isLoading = false;
    landingState.loadError = null;
    landingState.reducedMotion = false;
    landingState.navigate.mockReset();
    landingState.openLogin.mockReset();
    landingState.vouchers = [];
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(min-width: 768px)' && landingState.isDesktop,
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
    expect(screen.getByRole('region', { name: 'how a voucher moves through vouchit' })).toBeInTheDocument();
    expect(screen.getAllByText(/donated|available|claimed/i)).toHaveLength(3);
  });

  it.each([
    { isLoading: true, loadError: null, vouchers: [] },
    { isLoading: false, loadError: 'offline', vouchers: [] },
    { isLoading: false, loadError: null, vouchers: [] },
  ])('omits availability proof for $isLoading/$loadError', (state) => {
    renderLanding(state);

    expect(screen.queryByText(/available right now/i)).not.toBeInTheDocument();
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
    expect(within(steps).getByText("share a wallet voucher you won't use")).toBeInTheDocument();
    expect(within(steps).getByText('browse active vouchers without an account')).toBeInTheDocument();
    expect(within(steps).getByText('sign in, claim once, and receive the protected details')).toBeInTheDocument();
  });

  it('includes the browse closing action and minimal footer links', () => {
    renderLanding();

    expect(screen.getAllByRole('link', { name: 'browse vouchers' })).toHaveLength(2);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toHaveAttribute('data-layout', 'responsive');
    expect(screen.getByRole('link', { name: 'community' })).toHaveAttribute('href', '/community');
    expect(screen.getByRole('link', { name: 'about' })).toHaveAttribute('href', '/about');
    expect(screen.getByRole('link', { name: 'vouchit repository' })).toHaveAttribute('href', 'https://github.com/heykay-47/vouchit.git');
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

  it('renders the exchange stages in their final state when reduced motion is requested', () => {
    renderLanding({ reducedMotion: true });

    expect(screen.getByTestId('exchange-marker')).toHaveAttribute('data-motion-state', 'reduced');
    expect(screen.getByTestId('exchange-connector')).toHaveAttribute('data-motion-state', 'reduced');
    expect(within(screen.getByTestId('exchange-track')).getAllByRole('listitem')).toHaveLength(3);
  });

  it('progresses the marker through all stage centers on the desktop track', () => {
    renderLanding({ isDesktop: true });

    const marker = screen.getByTestId('exchange-marker');
    expect(marker).toHaveAttribute('data-motion-axis', 'horizontal');
    expect(marker).toHaveAttribute('data-motion-stages', 'donated available claimed');
    expect(screen.getByTestId('exchange-track')).toHaveClass('exchange-board__track');
    expect(within(screen.getByTestId('exchange-track')).getAllByRole('listitem').map((stage) => stage.getAttribute('data-stage'))).toEqual([
      'donated',
      'available',
      'claimed',
    ]);
  });

  it('uses the vertical track geometry below the desktop breakpoint', () => {
    renderLanding({ isDesktop: false });

    expect(screen.getByTestId('exchange-marker')).toHaveAttribute('data-motion-axis', 'vertical');
    expect(screen.getByTestId('exchange-connector')).toHaveAttribute('data-motion-axis', 'vertical');
  });
});

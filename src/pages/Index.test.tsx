import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Index from './Index';

const landingState = vi.hoisted(() => ({
  isAuthenticated: false,
  navigate: vi.fn(),
  openLogin: vi.fn(),
  reducedMotion: false,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: landingState.isAuthenticated }),
}));

vi.mock('@/contexts/AuthDialogContext', () => ({
  useAuthDialog: () => ({ openLogin: landingState.openLogin }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => landingState.navigate };
});

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return { ...actual, useReducedMotion: () => landingState.reducedMotion };
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
    landingState.reducedMotion = false;
    landingState.navigate.mockReset();
    landingState.openLogin.mockReset();
  });

  it('explains the exchange and exposes the primary action in the first viewport', () => {
    renderLanding();

    expect(screen.getByRole('heading', { level: 1, name: "good vouchers shouldn't go unused." })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'browse vouchers' })).toHaveAttribute('href', '/browse');
    expect(screen.getByRole('region', { name: 'how a voucher moves through vouchit' })).toBeInTheDocument();
    expect(screen.getAllByText(/donated|available|claimed/i)).toHaveLength(3);
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
    expect(menu).toHaveClass('min-h-11', 'min-w-11');

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
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });
});

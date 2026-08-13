import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithRouter } from '@/test/render';
import Sidebar from './Sidebar';

const openLogin = vi.fn();
const openSignup = vi.fn();
const logout = vi.fn();
const setTheme = vi.fn();
const desktopListeners = new Set<(event: MediaQueryListEvent) => void>();

let isDesktop = false;
let isAuthenticated = false;
let resolvedTheme = 'dark';

function enterDesktop() {
  isDesktop = true;
  const event = { matches: true, media: '(min-width: 1024px)' } as MediaQueryListEvent;
  desktopListeners.forEach((listener) => listener(event));
}

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated,
    user: isAuthenticated ? { id: 'user-1', username: 'user' } : null,
    logout,
  }),
}));

vi.mock('@/contexts/AuthDialogContext', () => ({
  useAuthDialog: () => ({ openLogin, openSignup }),
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme, setTheme }),
}));

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isDesktop = false;
    isAuthenticated = false;
    resolvedTheme = 'dark';
    desktopListeners.clear();
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: isDesktop,
      media: query,
      onchange: null,
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
        desktopListeners.add(listener);
      },
      removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
        desktopListeners.delete(listener);
      },
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it('marks the active route as the current page', () => {
    renderWithRouter(<Sidebar />, '/');

    expect(screen.getByRole('link', { name: 'browse' })).toHaveAttribute('aria-current', 'page');
    document.querySelectorAll('svg').forEach((icon) => {
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('opens a named mobile dialog and restores menu focus after Escape', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Sidebar />, '/');

    const menu = screen.getByRole('button', { name: 'open menu' });
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    expect(menu).toHaveAttribute('aria-controls', 'mobile-navigation');

    await user.click(menu);

    expect(menu).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: 'vouchit navigation' })).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: 'vouchit navigation' })).not.toBeInTheDocument();
    expect(menu).toHaveFocus();
  });

  it('gives every mobile drawer navigation and account control a 44px target', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Sidebar />, '/');

    await user.click(screen.getByRole('button', { name: 'open menu' }));
    const drawer = within(screen.getByRole('dialog', { name: 'vouchit navigation' }));

    expect(drawer.getByRole('link', { name: /VouchIt/i })).toHaveClass('min-h-11');
    for (const name of ['browse', 'donate', 'community', 'about']) {
      expect(drawer.getByRole('link', { name })).toHaveClass('min-h-11');
    }
    expect(drawer.getByRole('button', { name: 'log in' })).toHaveClass('h-11');
    expect(drawer.getByRole('button', { name: 'sign up' })).toHaveClass('h-11');
    expect(drawer.getByRole('button', { name: 'switch to light theme' })).toHaveClass('h-11');
  });

  it('gives authenticated logout a 44px target', () => {
    isAuthenticated = true;
    renderWithRouter(<Sidebar />, '/');

    expect(screen.getByRole('button', { name: 'log out' })).toHaveClass('min-h-11');
  });

  it('switches from the resolved theme to the other reachable theme', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Sidebar />, '/');

    await user.click(screen.getByRole('button', { name: 'switch to light theme' }));
    expect(setTheme).toHaveBeenCalledWith('light');
  });

  it('closes the mobile dialog before opening login', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Sidebar />, '/');

    await user.click(screen.getByRole('button', { name: 'open menu' }));
    const dialog = screen.getByRole('dialog', { name: 'vouchit navigation' });
    await user.click(screen.getByRole('button', { name: 'log in' }));

    expect(openLogin).toHaveBeenCalledOnce();
    expect(dialog).not.toBeInTheDocument();
  });

  it('keeps the drawer 224px wide and full height at tablet widths', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Sidebar />, '/');

    await user.click(screen.getByRole('button', { name: 'open menu' }));

    const drawer = screen.getByRole('dialog', { name: 'vouchit navigation' });
    expect(drawer).toHaveClass('w-56', 'sm:w-56', 'h-dvh', 'max-h-dvh');
    expect(drawer).not.toHaveClass('sm:w-full', 'max-h-[calc(100dvh-2rem)]');
  });

  it('uses only a 200ms left-edge horizontal drawer transition', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Sidebar />, '/');

    await user.click(screen.getByRole('button', { name: 'open menu' }));

    const drawer = screen.getByRole('dialog', { name: 'vouchit navigation' });
    expect(drawer).toHaveClass(
      'duration-200',
      'data-[state=open]:slide-in-from-left-full',
      'data-[state=closed]:slide-out-to-left-full',
      'motion-reduce:animate-none',
      'motion-reduce:transition-none',
    );
    expect(drawer).not.toHaveClass(
      'data-[state=open]:zoom-in-95',
      'data-[state=closed]:zoom-out-95',
      'data-[state=open]:slide-in-from-top-[48%]',
      'data-[state=closed]:slide-out-to-top-[48%]',
    );
  });

  it('closes an open mobile drawer when the desktop breakpoint starts matching', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Sidebar />, '/');

    await user.click(screen.getByRole('button', { name: 'open menu' }));
    expect(screen.getByRole('dialog', { name: 'vouchit navigation' })).toBeInTheDocument();

    act(() => enterDesktop());

    expect(screen.queryByRole('dialog', { name: 'vouchit navigation' })).not.toBeInTheDocument();
  });
});

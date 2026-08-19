import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithRouter } from '@/test/render';
import type { UserRole } from '@/lib/types';
import Sidebar from './Sidebar';

const openLogin = vi.fn();
const openSignup = vi.fn();
const logout = vi.fn();
const setTheme = vi.fn();
const desktopListeners = new Set<(event: MediaQueryListEvent) => void>();

let isDesktop = false;
let isAuthenticated = false;
let resolvedTheme = 'dark';
let userRole: UserRole = 'customer';

function enterDesktop() {
  isDesktop = true;
  const event = { matches: true, media: '(min-width: 1024px)' } as MediaQueryListEvent;
  desktopListeners.forEach((listener) => listener(event));
}

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated,
    user: isAuthenticated ? { id: 'user-1', username: 'user', role: userRole } : null,
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
    userRole = 'customer';
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
    renderWithRouter(<Sidebar />, '/browse');

    expect(screen.getByRole('link', { name: 'browse' })).toHaveAttribute('aria-current', 'page');
    document.querySelectorAll('svg').forEach((icon) => {
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('takes browse to the operating browse route', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Sidebar />, '/donate');

    await user.click(screen.getByRole('link', { name: 'browse' }));

    expect(window.location.pathname).toBe('/browse');
  });

  it('makes the public business path discoverable without replacing browse', () => {
    renderWithRouter(<Sidebar />, '/browse');

    expect(screen.getByRole('link', { name: 'browse' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'for businesses' })).toHaveAttribute('href', '/for-businesses');
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
    for (const name of ['browse', 'for businesses', 'community', 'about']) {
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

  it('shows customer operating links without business mutations', () => {
    isAuthenticated = true;
    userRole = 'customer';
    renderWithRouter(<Sidebar />, '/dashboard');

    expect(screen.getByRole('link', { name: 'donate' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'dashboard' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'campaigns' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'invoices' })).not.toBeInTheDocument();
  });

  it('shows only business operating links to a business', () => {
    isAuthenticated = true;
    userRole = 'business';
    renderWithRouter(<Sidebar />, '/business');

    expect(screen.getByRole('link', { name: 'campaigns' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'invoices' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'donate' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'dashboard' })).not.toBeInTheDocument();
  });

  it.each([
    ['customer', 'dashboard'],
    ['business', 'business'],
  ] as const)('navigates a returned %s user to their role home', async (role, destination) => {
    const user = userEvent.setup();
    userRole = role;
    renderWithRouter(<Sidebar />, '/browse');

    await user.click(screen.getByRole('button', { name: 'log in' }));
    const continuation = openLogin.mock.calls[0]?.[1] as ((user: { role: UserRole }) => void) | undefined;
    expect(continuation).toEqual(expect.any(Function));

    act(() => continuation?.({ role }));

    expect(window.location.pathname).toBe(`/${destination}`);
  });
});

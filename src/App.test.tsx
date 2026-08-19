import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@/lib/types';
import App from './App';

const authState = vi.hoisted(() => ({
  user: null as User | null,
  isLoading: false,
}));

vi.mock('./pages/Index', () => ({
  default: () => <main aria-label="VouchIt landing">landing page</main>,
}));

vi.mock('./pages/Browse', () => ({
  default: () => <div>browse page</div>,
}));

vi.mock('./pages/Dashboard', () => ({ default: () => <div>dashboard page</div> }));
vi.mock('./pages/Donate', () => ({ default: () => <div>donate page</div> }));
vi.mock('./pages/business/BusinessDashboard', () => ({ default: () => <div>business dashboard page</div> }));
vi.mock('./pages/business/CampaignWorkspace', () => ({ default: () => <div>campaign workspace page</div> }));
vi.mock('./pages/Settings', () => ({ default: () => <div>settings page</div> }));
vi.mock('./pages/About', () => ({ default: () => <div>about page</div> }));
vi.mock('./pages/ForBusinesses', () => ({ default: () => <div>for businesses page</div> }));
vi.mock('./pages/Community', () => ({ default: () => <div>community page</div> }));
vi.mock('./pages/NotFound', () => ({ default: () => <div>not found page</div> }));

vi.mock('./components/Sidebar', () => ({
  default: () => <aside data-testid="operating-sidebar">operating sidebar</aside>,
}));

vi.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    user: authState.user,
    isLoading: authState.isLoading,
    isAuthenticated: !!authState.user,
  }),
}));

vi.mock('./contexts/VoucherContext', () => ({
  VoucherProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('./contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/components/AuthModal', () => ({ default: () => null }));

describe('App route layouts', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
    authState.user = null;
    authState.isLoading = false;
  });

  it('renders the landing route without the operating sidebar', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);

    expect(await screen.findByRole('main', { name: /vouchit landing/i })).toBeInTheDocument();
    expect(screen.queryByTestId('operating-sidebar')).not.toBeInTheDocument();
  });

  it('renders browse inside the operating layout', async () => {
    window.history.pushState({}, '', '/browse');
    render(<App />);

    expect(await screen.findByText('browse page')).toBeInTheDocument();
    expect(screen.getByTestId('operating-sidebar')).toBeInTheDocument();
  });

  it('renders the public business positioning page inside the operating layout', async () => {
    window.history.pushState({}, '', '/for-businesses');
    render(<App />);

    expect(await screen.findByText('for businesses page')).toBeInTheDocument();
    expect(screen.getByTestId('operating-sidebar')).toBeInTheDocument();
  });

  it('redirects anonymous users away from customer routes', async () => {
    window.history.pushState({}, '', '/dashboard');
    render(<App />);

    expect(await screen.findByRole('main', { name: /vouchit landing/i })).toBeInTheDocument();
  });

  it('renders customer donate and dashboard routes for customers', async () => {
    authState.user = {
      id: 'customer-1',
      email: 'customer@example.com',
      username: 'customer',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      role: 'customer',
      redeemedVouchers: [],
    };

    window.history.pushState({}, '', '/donate');
    const { unmount } = render(<App />);
    expect(await screen.findByText('donate page')).toBeInTheDocument();
    unmount();

    window.history.pushState({}, '', '/dashboard');
    render(<App />);
    expect(await screen.findByText('dashboard page')).toBeInTheDocument();
  });

  it('renders the business dashboard for businesses', async () => {
    authState.user = {
      id: 'business-1',
      email: 'business@example.com',
      username: 'business',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      role: 'business',
      redeemedVouchers: [],
    };
    window.history.pushState({}, '', '/business');
    render(<App />);

    expect(await screen.findByText('business dashboard page')).toBeInTheDocument();
  });

  it('renders business campaign routes for businesses', async () => {
    authState.user = {
      id: 'business-1',
      email: 'business@example.com',
      username: 'business',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      role: 'business',
      redeemedVouchers: [],
    };
    window.history.pushState({}, '', '/business/campaigns/new');
    const { unmount } = render(<App />);
    expect(await screen.findByText('campaign workspace page')).toBeInTheDocument();
    unmount();

    window.history.pushState({}, '', '/business/campaigns');
    const dashboardRoute = render(<App />);
    expect(await screen.findByText('business dashboard page')).toBeInTheDocument();
    dashboardRoute.unmount();

    window.history.pushState({}, '', '/business/campaigns/campaign-1');
    render(<App />);
    expect(await screen.findByText('campaign workspace page')).toBeInTheDocument();
  });

  it('redirects a customer away from the business route', async () => {
    authState.user = {
      id: 'customer-1',
      email: 'customer@example.com',
      username: 'customer',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      role: 'customer',
      redeemedVouchers: [],
    };
    window.history.pushState({}, '', '/business');
    render(<App />);

    expect(await screen.findByText('dashboard page')).toBeInTheDocument();
  });
});

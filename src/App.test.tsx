import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./pages/Index', () => ({
  default: () => <main aria-label="VouchIt landing">landing page</main>,
}));

vi.mock('./pages/Browse', () => ({
  default: () => <div>browse page</div>,
}));

vi.mock('./pages/Dashboard', () => ({ default: () => <div>dashboard page</div> }));
vi.mock('./pages/Donate', () => ({ default: () => <div>donate page</div> }));
vi.mock('./pages/Settings', () => ({ default: () => <div>settings page</div> }));
vi.mock('./pages/About', () => ({ default: () => <div>about page</div> }));
vi.mock('./pages/Community', () => ({ default: () => <div>community page</div> }));
vi.mock('./pages/NotFound', () => ({ default: () => <div>not found page</div> }));

vi.mock('./components/Sidebar', () => ({
  default: () => <aside data-testid="operating-sidebar">operating sidebar</aside>,
}));

vi.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({ user: null, isLoading: false }),
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
});

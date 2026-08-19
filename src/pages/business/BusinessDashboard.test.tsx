import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@/lib/types';
import BusinessDashboard from './BusinessDashboard';

const business: User = {
  id: 'business-1',
  email: 'business@example.com',
  username: 'business',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  role: 'business',
  redeemedVouchers: [],
};

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: business }),
}));

describe('BusinessDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a business workspace shell without fabricated metrics', () => {
    render(<BusinessDashboard />);

    expect(screen.getByRole('heading', { name: 'business dashboard' })).toBeInTheDocument();
    expect(screen.getByText(/welcome back, business/i)).toBeInTheDocument();
    expect(screen.queryByText(/total vouchers|revenue|claims|conversion/i)).not.toBeInTheDocument();
  });
});

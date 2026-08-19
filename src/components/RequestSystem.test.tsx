import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@/lib/types';
import RequestSystem from './RequestSystem';

const mocks = vi.hoisted(() => ({
  listRequests: vi.fn(),
  createRequest: vi.fn(),
  toast: { error: vi.fn(), success: vi.fn() },
  logger: { error: vi.fn() },
  user: null as User | null,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user }),
}));

vi.mock('@/services/community.service', () => ({
  communityService: {
    listRequests: mocks.listRequests,
    createRequest: mocks.createRequest,
  },
}));

vi.mock('@/utils/toast', () => ({ toast: mocks.toast }));
vi.mock('@/utils/logger', () => ({ logger: mocks.logger }));

const customer: User = {
  id: 'customer-1',
  email: 'customer@example.com',
  username: 'customer',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  role: 'customer',
  redeemedVouchers: [],
};

const business: User = { ...customer, id: 'business-1', role: 'business' };

describe('RequestSystem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user = customer;
    mocks.listRequests.mockResolvedValue([]);
  });

  it('shows request creation to customers', async () => {
    render(<RequestSystem />);

    await waitFor(() => expect(screen.getByText('No voucher requests yet')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /new request/i })).toBeInTheDocument();
  });

  it('suppresses request creation for businesses while retaining requests', async () => {
    mocks.user = business;
    render(<RequestSystem />);

    await waitFor(() => expect(screen.getByText('No voucher requests yet')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /new request/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submit request/i })).not.toBeInTheDocument();
  });
});

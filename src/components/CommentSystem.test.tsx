import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@/lib/types';
import CommentSystem from './CommentSystem';

const mocks = vi.hoisted(() => ({
  listComments: vi.fn(),
  addComment: vi.fn(),
  toast: { error: vi.fn(), success: vi.fn() },
  logger: { error: vi.fn() },
  user: null as User | null,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user }),
}));

vi.mock('@/services/community.service', () => ({
  communityService: {
    listComments: mocks.listComments,
    addComment: mocks.addComment,
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

describe('CommentSystem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user = customer;
    mocks.listComments.mockResolvedValue([]);
  });

  it('shows the comment form to customers', async () => {
    render(<CommentSystem voucherId="voucher-1" />);

    await waitFor(() => expect(screen.getByText('No comments yet. Be the first to comment!')).toBeInTheDocument());
    expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /post comment/i })).toBeInTheDocument();
  });

  it('suppresses the comment form for businesses while retaining comments', async () => {
    mocks.user = business;
    render(<CommentSystem voucherId="voucher-1" />);

    await waitFor(() => expect(screen.getByText('No comments yet. Be the first to comment!')).toBeInTheDocument());
    expect(screen.queryByPlaceholderText('Add a comment...')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /post comment/i })).not.toBeInTheDocument();
  });
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthContextType, User } from '@/lib/types';
import { offersQueryKey } from '@/hooks/useOffersQuery';
import { vouchersQueryKey } from '@/hooks/useVouchersQuery';
import { AuthProvider, useAuth } from './AuthContext';

const authServiceMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  signInWithEmail: vi.fn(),
  signOut: vi.fn(),
  signUpWithEmail: vi.fn(),
  updateProfile: vi.fn(),
}));

vi.mock('@/services/auth.service', () => authServiceMocks);
vi.mock('@/utils/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const authenticatedUser: User = {
  id: 'customer-1',
  email: 'customer@example.com',
  username: 'customer',
  role: 'customer',
  createdAt: new Date('2026-08-23T00:00:00.000Z'),
  redeemedVouchers: [],
};
const privateOfferPage = { offers: [], total: 0, nextCursor: null, hasMore: false };
const voucherWithCode = { id: 'voucher-1', code: 'PRIVATE-CODE' };

let auth: AuthContextType;
let queryClient: QueryClient;

const Probe = () => {
  auth = useAuth();
  return null;
};

const renderAuth = () => render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider><Probe /></AuthProvider>
  </QueryClientProvider>,
);

const seedViewerQueries = () => {
  queryClient.setQueryData(['offers', 'previous-user'], privateOfferPage);
  queryClient.setQueryData(vouchersQueryKey, [voucherWithCode]);
};

const expectViewerQueriesCleared = () => {
  expect(queryClient.getQueriesData({ queryKey: offersQueryKey })).toEqual([]);
  expect(queryClient.getQueryData(vouchersQueryKey)).toBeUndefined();
};

describe('AuthProvider viewer cache safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    authServiceMocks.getCurrentUser.mockResolvedValue({ user: null });
    authServiceMocks.signInWithEmail.mockResolvedValue({ success: true, user: authenticatedUser });
    authServiceMocks.signUpWithEmail.mockResolvedValue({ success: true, user: authenticatedUser });
    authServiceMocks.signOut.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it.each(['login', 'signup', 'logout', 'auth:401'] as const)(
    'clears viewer-dependent queries after %s',
    async (transition) => {
      if (transition === 'logout' || transition === 'auth:401') {
        authServiceMocks.getCurrentUser.mockResolvedValueOnce({ user: authenticatedUser });
      }
      renderAuth();
      await waitFor(() => expect(auth.isLoading).toBe(false));
      seedViewerQueries();

      if (transition === 'login') {
        await act(async () => auth.login('customer@example.com', 'password123'));
      } else if (transition === 'signup') {
        await act(async () => auth.signup({
          role: 'customer',
          email: 'customer@example.com',
          username: 'customer',
          password: 'password123',
        }));
      } else if (transition === 'logout') {
        await act(async () => auth.logout());
      } else {
        act(() => window.dispatchEvent(new CustomEvent('auth:401')));
      }

      expectViewerQueriesCleared();
    },
  );

  it('clears viewer-dependent queries when startup resolves an authenticated viewer', async () => {
    authServiceMocks.getCurrentUser.mockResolvedValueOnce({ user: authenticatedUser });
    seedViewerQueries();
    renderAuth();

    await waitFor(() => expect(auth.user).toEqual(authenticatedUser));

    expectViewerQueriesCleared();
  });

  it('clears viewer-dependent queries when remote logout fails', async () => {
    authServiceMocks.getCurrentUser.mockResolvedValueOnce({ user: authenticatedUser });
    authServiceMocks.signOut.mockResolvedValueOnce({ success: false, error: 'Network unavailable' });
    renderAuth();
    await waitFor(() => expect(auth.user).toEqual(authenticatedUser));
    seedViewerQueries();

    await act(async () => auth.logout());

    expect(auth.user).toBeNull();
    expectViewerQueriesCleared();
  });
});

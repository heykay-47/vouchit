import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthContextType, User } from '@/lib/types';
import { offersQueryKey } from '@/hooks/useOffersQuery';
import { vouchersQueryKey } from '@/hooks/useVouchersQuery';
import { ApiClientError } from '@/services/api-client';
import { AuthProvider, useAuth } from './AuthContext';
import { VoucherProvider, useVouchers } from './VoucherContext';

const authServiceMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  signInWithEmail: vi.fn(),
  signOut: vi.fn(),
  signUpWithEmail: vi.fn(),
  updateProfile: vi.fn(),
}));
const voucherServiceMocks = vi.hoisted(() => ({
  donate: vi.fn(),
  list: vi.fn(),
  redeem: vi.fn(),
  report: vi.fn(),
}));

vi.mock('@/services/auth.service', () => authServiceMocks);
vi.mock('@/services/voucher.service', () => ({ voucherService: voucherServiceMocks }));
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
const secondUser: User = {
  ...authenticatedUser,
  id: 'customer-2',
  email: 'second@example.com',
  username: 'second',
};
const publicVoucher = { id: 'public-voucher', title: 'PUBLIC', code: undefined };
const firstPrivateVoucher = { id: 'private-1', title: 'PRIVATE-ONE', code: 'CODE-ONE' };
const secondPrivateVoucher = { id: 'private-2', title: 'PRIVATE-TWO', code: 'CODE-TWO' };

let auth: AuthContextType;
let queryClient: QueryClient;

const Probe = () => {
  auth = useAuth();
  return null;
};

const ActiveVoucherProbe = () => {
  auth = useAuth();
  const { vouchers } = useVouchers();
  return (
    <output data-testid="active-vouchers">
      {vouchers.map((voucher) => `${voucher.title}:${voucher.code ?? 'public'}`).join(',')}
    </output>
  );
};

const renderAuth = () => render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider><Probe /></AuthProvider>
  </QueryClientProvider>,
);

const renderAuthWithVouchers = () => render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <VoucherProvider><ActiveVoucherProbe /></VoucherProvider>
    </AuthProvider>
  </QueryClientProvider>,
);

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
};

const expectActiveVouchers = async (summary: string) => {
  await waitFor(() => expect(screen.getByTestId('active-vouchers')).toHaveTextContent(summary));
};

const seedViewerQueries = () => {
  queryClient.setQueryData(['offers', 'previous-user'], privateOfferPage);
  queryClient.setQueryData([...vouchersQueryKey, 'previous-user'], [voucherWithCode]);
};

const expectViewerQueriesCleared = () => {
  expect(queryClient.getQueriesData({ queryKey: offersQueryKey })).toEqual([]);
  expect(queryClient.getQueriesData({ queryKey: vouchersQueryKey })).toEqual([]);
};

describe('AuthProvider viewer cache safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    authServiceMocks.getCurrentUser.mockResolvedValue({ user: null });
    authServiceMocks.signInWithEmail.mockResolvedValue({ success: true, user: authenticatedUser });
    authServiceMocks.signUpWithEmail.mockResolvedValue({ success: true, user: authenticatedUser });
    authServiceMocks.signOut.mockResolvedValue({ success: true });
    voucherServiceMocks.list.mockReset();
    voucherServiceMocks.list.mockResolvedValue([publicVoucher]);
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

  it('retains the authenticated viewer and caches when remote logout fails', async () => {
    authServiceMocks.getCurrentUser.mockResolvedValueOnce({ user: authenticatedUser });
    authServiceMocks.signOut.mockResolvedValueOnce({ success: false, error: 'Network unavailable' });
    renderAuth();
    await waitFor(() => expect(auth.user).toEqual(authenticatedUser));
    seedViewerQueries();

    await act(async () => auth.logout());

    expect(auth.user).toEqual(authenticatedUser);
    expect(queryClient.getQueriesData({ queryKey: offersQueryKey })).toHaveLength(1);
    expect(queryClient.getQueriesData({ queryKey: vouchersQueryKey })).toHaveLength(1);
  });

  it('waits for startup auth resolution before loading the active viewer vouchers', async () => {
    const startup = deferred<{ user: User }>();
    authServiceMocks.getCurrentUser.mockReturnValueOnce(startup.promise);
    voucherServiceMocks.list.mockResolvedValueOnce([firstPrivateVoucher]);

    renderAuthWithVouchers();

    expect(voucherServiceMocks.list).not.toHaveBeenCalled();

    await act(async () => startup.resolve({ user: authenticatedUser }));
    await expectActiveVouchers('PRIVATE-ONE:CODE-ONE');
    expect(voucherServiceMocks.list).toHaveBeenCalledTimes(1);
  });

  it('does not load an anonymous voucher query when startup auth cannot resolve', async () => {
    authServiceMocks.getCurrentUser.mockRejectedValueOnce(new ApiClientError('Network error', 0));

    renderAuthWithVouchers();

    await waitFor(() => expect(auth.isLoading).toBe(false));
    expect(voucherServiceMocks.list).not.toHaveBeenCalled();
    expect(screen.getByTestId('active-vouchers')).toBeEmptyDOMElement();
  });

  it('does not expose an anonymous cache entry before startup auth resolves', () => {
    const startup = deferred<{ user: User }>();
    authServiceMocks.getCurrentUser.mockReturnValueOnce(startup.promise);
    queryClient.setQueryData([...vouchersQueryKey, 'anonymous'], [firstPrivateVoucher]);

    renderAuthWithVouchers();

    expect(screen.getByTestId('active-vouchers')).toBeEmptyDOMElement();
    expect(voucherServiceMocks.list).not.toHaveBeenCalled();
  });

  it.each(['login', 'signup'] as const)(
    'rebinds the active voucher observer after %s',
    async (transition) => {
      voucherServiceMocks.list
        .mockResolvedValueOnce([publicVoucher])
        .mockResolvedValueOnce([firstPrivateVoucher]);
      renderAuthWithVouchers();
      await expectActiveVouchers('PUBLIC:public');

      if (transition === 'login') {
        await act(async () => auth.login('customer@example.com', 'password123'));
      } else {
        await act(async () => auth.signup({
          role: 'customer',
          email: 'customer@example.com',
          username: 'customer',
          password: 'password123',
        }));
      }

      await expectActiveVouchers('PRIVATE-ONE:CODE-ONE');
      expect(screen.getByTestId('active-vouchers')).not.toHaveTextContent('PUBLIC');
      expect(voucherServiceMocks.list).toHaveBeenCalledTimes(2);
    },
  );

  it.each(['logout', 'auth:401'] as const)(
    'removes private active voucher results after %s',
    async (transition) => {
      authServiceMocks.getCurrentUser.mockResolvedValueOnce({ user: authenticatedUser });
      const anonymousVouchers = deferred<typeof publicVoucher[]>();
      voucherServiceMocks.list
        .mockResolvedValueOnce([firstPrivateVoucher])
        .mockReturnValueOnce(anonymousVouchers.promise);
      renderAuthWithVouchers();
      await expectActiveVouchers('PRIVATE-ONE:CODE-ONE');

      if (transition === 'logout') {
        await act(async () => auth.logout());
      } else {
        await act(async () => window.dispatchEvent(new CustomEvent('auth:401')));
      }

      await waitFor(() => expect(auth.user).toBeNull());
      expect(screen.getByTestId('active-vouchers')).not.toHaveTextContent('CODE-ONE');

      await act(async () => anonymousVouchers.resolve([publicVoucher]));
      await expectActiveVouchers('PUBLIC:public');
      expect(voucherServiceMocks.list).toHaveBeenCalledTimes(2);
    },
  );

  it('removes the prior private result and cache when the account changes', async () => {
    authServiceMocks.getCurrentUser
      .mockResolvedValueOnce({ user: authenticatedUser })
      .mockResolvedValueOnce({ user: secondUser });
    voucherServiceMocks.list
      .mockResolvedValueOnce([firstPrivateVoucher])
      .mockResolvedValueOnce([secondPrivateVoucher]);
    renderAuthWithVouchers();
    await expectActiveVouchers('PRIVATE-ONE:CODE-ONE');

    await act(async () => auth.refreshUser());

    await expectActiveVouchers('PRIVATE-TWO:CODE-TWO');
    expect(screen.getByTestId('active-vouchers')).not.toHaveTextContent('CODE-ONE');
    expect(queryClient.getQueriesData({ queryKey: vouchersQueryKey })).toEqual([
      [[...vouchersQueryKey, secondUser.id], [secondPrivateVoucher]],
    ]);
  });

  it('keeps the authenticated viewer when remote logout fails', async () => {
    authServiceMocks.getCurrentUser.mockResolvedValueOnce({ user: authenticatedUser });
    authServiceMocks.signOut.mockResolvedValueOnce({ success: false, error: 'Network unavailable' });
    voucherServiceMocks.list.mockResolvedValueOnce([firstPrivateVoucher]);
    renderAuthWithVouchers();
    await expectActiveVouchers('PRIVATE-ONE:CODE-ONE');

    await act(async () => auth.logout());

    expect(auth.user).toEqual(authenticatedUser);
    expect(screen.getByTestId('active-vouchers')).toHaveTextContent('PRIVATE-ONE:CODE-ONE');
    expect(voucherServiceMocks.list).toHaveBeenCalledTimes(1);
  });

  it('preserves business, invoice, and unrelated caches across a viewer change', async () => {
    authServiceMocks.getCurrentUser.mockResolvedValueOnce({ user: authenticatedUser });
    voucherServiceMocks.list
      .mockResolvedValueOnce([firstPrivateVoucher])
      .mockResolvedValueOnce([publicVoucher]);
    renderAuthWithVouchers();
    await expectActiveVouchers('PRIVATE-ONE:CODE-ONE');
    queryClient.setQueryData(['business', 'campaigns'], ['campaign-1']);
    queryClient.setQueryData(['business', 'invoices'], ['invoice-1']);
    queryClient.setQueryData(['unrelated'], 'keep-me');

    await act(async () => auth.logout());
    await expectActiveVouchers('PUBLIC:public');

    expect(queryClient.getQueryData(['business', 'campaigns'])).toEqual(['campaign-1']);
    expect(queryClient.getQueryData(['business', 'invoices'])).toEqual(['invoice-1']);
    expect(queryClient.getQueryData(['unrelated'])).toBe('keep-me');
  });
});

import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthContextType, User } from '@/lib/types';
import { offersQueryKey, useOffersQuery } from '@/hooks/useOffersQuery';
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
const offerServiceMocks = vi.hoisted(() => ({
  claimCampaign: vi.fn(),
  list: vi.fn(),
  recordCampaignView: vi.fn(),
}));

vi.mock('@/services/auth.service', () => authServiceMocks);
vi.mock('@/services/voucher.service', () => ({ voucherService: voucherServiceMocks }));
vi.mock('@/services/offer.service', () => ({ offerService: offerServiceMocks }));
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

const ActiveOfferProbe = () => {
  const query = useOffersQuery({ q: '', source: 'all', expiringSoon: false });
  return <output data-testid="active-offers">{query.data?.pages[0]?.total}</output>;
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

const renderAuthWithViewerQueries = () => render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <VoucherProvider>
        <ActiveVoucherProbe />
        <ActiveOfferProbe />
      </VoucherProvider>
    </AuthProvider>
  </QueryClientProvider>,
);

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
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
    vi.resetAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    authServiceMocks.getCurrentUser.mockResolvedValue({ user: null });
    authServiceMocks.signInWithEmail.mockResolvedValue({ success: true, user: authenticatedUser });
    authServiceMocks.signUpWithEmail.mockResolvedValue({ success: true, user: authenticatedUser });
    authServiceMocks.signOut.mockResolvedValue({ success: true });
    voucherServiceMocks.list.mockReset();
    voucherServiceMocks.list.mockResolvedValue([publicVoucher]);
    offerServiceMocks.list.mockResolvedValue(privateOfferPage);
  });

  afterEach(() => {
    cleanup();
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

  it('clears viewer caches and leaves identity unresolved when remote logout fails', async () => {
    authServiceMocks.getCurrentUser.mockResolvedValueOnce({ user: authenticatedUser });
    authServiceMocks.signOut.mockResolvedValueOnce({ success: false, error: 'Network unavailable' });
    renderAuth();
    await waitFor(() => expect(auth.user).toEqual(authenticatedUser));
    seedViewerQueries();

    await act(async () => auth.logout());

    expect(auth.user).toBeNull();
    expect(auth.viewerKey).toBeNull();
    expect(auth.isLoading).toBe(false);
    expectViewerQueriesCleared();
  });

  it('finishes loading and runs anonymous queries when auth:401 invalidates startup resolution', async () => {
    const startup = deferred<{ user: User }>();
    authServiceMocks.getCurrentUser.mockReturnValueOnce(startup.promise);
    offerServiceMocks.list.mockResolvedValueOnce({ ...privateOfferPage, total: 1 });

    renderAuthWithViewerQueries();

    expect(auth.isLoading).toBe(true);
    expect(voucherServiceMocks.list).not.toHaveBeenCalled();
    expect(offerServiceMocks.list).not.toHaveBeenCalled();

    act(() => window.dispatchEvent(new CustomEvent('auth:401')));

    await waitFor(() => expect(auth.isLoading).toBe(false));
    await expectActiveVouchers('PUBLIC:public');
    await waitFor(() => expect(screen.getByTestId('active-offers')).toHaveTextContent('1'));
    expect(auth.user).toBeNull();
    expect(auth.viewerKey).toBe('anonymous');

    await act(async () => {
      startup.resolve({ user: authenticatedUser });
      await startup.promise;
    });

    expect(auth.user).toBeNull();
    expect(auth.viewerKey).toBe('anonymous');
    expect(auth.isLoading).toBe(false);
    expect(voucherServiceMocks.list).toHaveBeenCalledTimes(1);
    expect(offerServiceMocks.list).toHaveBeenCalledTimes(1);
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

  it('recovers viewer-bound queries on reconnect after a transient startup failure', async () => {
    authServiceMocks.getCurrentUser
      .mockRejectedValueOnce(new ApiClientError('Network error', 0))
      .mockResolvedValueOnce({ user: authenticatedUser });
    voucherServiceMocks.list.mockResolvedValueOnce([firstPrivateVoucher]);
    offerServiceMocks.list.mockResolvedValueOnce({ ...privateOfferPage, total: 1 });

    renderAuthWithViewerQueries();
    await waitFor(() => expect(auth.isLoading).toBe(false));

    expect(auth.viewerKey).toBeNull();
    expect(voucherServiceMocks.list).not.toHaveBeenCalled();
    expect(offerServiceMocks.list).not.toHaveBeenCalled();
    expect(screen.getByTestId('active-vouchers')).toBeEmptyDOMElement();
    expect(screen.getByTestId('active-offers')).toBeEmptyDOMElement();

    act(() => onlineManager.setOnline(false));
    act(() => onlineManager.setOnline(true));

    await expectActiveVouchers('PRIVATE-ONE:CODE-ONE');
    await waitFor(() => expect(screen.getByTestId('active-offers')).toHaveTextContent('1'));
    expect(auth.viewerKey).toBe(authenticatedUser.id);
    expect(authServiceMocks.getCurrentUser).toHaveBeenCalledTimes(2);
    expect(voucherServiceMocks.list).toHaveBeenCalledTimes(1);
    expect(offerServiceMocks.list).toHaveBeenCalledTimes(1);
  });

  it('resolves anonymous and enables public queries when an explicit retry receives 401', async () => {
    authServiceMocks.getCurrentUser
      .mockRejectedValueOnce(new ApiClientError('Network error', 0))
      .mockRejectedValueOnce(new ApiClientError('Authentication required', 401));
    offerServiceMocks.list.mockResolvedValueOnce({ ...privateOfferPage, total: 1 });

    renderAuthWithViewerQueries();
    await waitFor(() => expect(auth.isLoading).toBe(false));

    expect(auth.viewerKey).toBeNull();
    expect(voucherServiceMocks.list).not.toHaveBeenCalled();
    expect(offerServiceMocks.list).not.toHaveBeenCalled();

    await act(async () => auth.refreshUser());

    await expectActiveVouchers('PUBLIC:public');
    await waitFor(() => expect(screen.getByTestId('active-offers')).toHaveTextContent('1'));
    expect(auth.viewerKey).toBe('anonymous');
    expect(authServiceMocks.getCurrentUser).toHaveBeenCalledTimes(2);
    expect(voucherServiceMocks.list).toHaveBeenCalledTimes(1);
    expect(offerServiceMocks.list).toHaveBeenCalledTimes(1);
  });

  it('does not duplicate an unresolved auth request across reconnects', async () => {
    const recovery = deferred<{ user: User }>();
    authServiceMocks.getCurrentUser
      .mockRejectedValueOnce(new ApiClientError('Network error', 0))
      .mockReturnValueOnce(recovery.promise);

    renderAuthWithVouchers();
    await waitFor(() => expect(auth.isLoading).toBe(false));

    act(() => onlineManager.setOnline(false));
    act(() => onlineManager.setOnline(true));
    act(() => onlineManager.setOnline(false));
    act(() => onlineManager.setOnline(true));

    expect(authServiceMocks.getCurrentUser).toHaveBeenCalledTimes(2);

    await act(async () => recovery.resolve({ user: authenticatedUser }));
    await expectActiveVouchers('PUBLIC:public');
  });

  it('ignores a stale recovery 401 after login resolves a viewer', async () => {
    const recovery = deferred<{ user: User }>();
    authServiceMocks.getCurrentUser
      .mockRejectedValueOnce(new ApiClientError('Network error', 0))
      .mockReturnValueOnce(recovery.promise);
    voucherServiceMocks.list.mockResolvedValueOnce([firstPrivateVoucher]);
    renderAuthWithVouchers();
    await waitFor(() => expect(auth.isLoading).toBe(false));

    let recoveryRequest!: Promise<void>;
    act(() => { recoveryRequest = auth.refreshUser(); });
    await waitFor(() => expect(authServiceMocks.getCurrentUser).toHaveBeenCalledTimes(2));

    await act(async () => auth.login('customer@example.com', 'password123'));
    await expectActiveVouchers('PRIVATE-ONE:CODE-ONE');

    await act(async () => {
      recovery.reject(new ApiClientError('Authentication required', 401));
      await recoveryRequest;
    });

    expect(auth.user).toEqual(authenticatedUser);
    expect(auth.viewerKey).toBe(authenticatedUser.id);
    expect(screen.getByTestId('active-vouchers')).toHaveTextContent('PRIVATE-ONE:CODE-ONE');
    expect(voucherServiceMocks.list).toHaveBeenCalledTimes(1);
  });

  it('does not start viewer recovery while login is pending', async () => {
    const loginResult = deferred<{ success: boolean; user: User }>();
    authServiceMocks.getCurrentUser.mockRejectedValueOnce(new ApiClientError('Network error', 0));
    authServiceMocks.signInWithEmail.mockReturnValueOnce(loginResult.promise);
    renderAuth();
    await waitFor(() => expect(auth.isLoading).toBe(false));

    let loginRequest!: Promise<User>;
    act(() => { loginRequest = auth.login('customer@example.com', 'password123'); });
    await act(async () => auth.refreshUser());
    act(() => onlineManager.setOnline(false));
    act(() => onlineManager.setOnline(true));

    expect(authServiceMocks.getCurrentUser).toHaveBeenCalledTimes(1);

    await act(async () => {
      loginResult.resolve({ success: true, user: authenticatedUser });
      await loginRequest;
    });

    expect(auth.user).toEqual(authenticatedUser);
  });

  it('ignores a stale authenticated recovery after logout resolves anonymous', async () => {
    const recovery = deferred<{ user: User }>();
    authServiceMocks.getCurrentUser
      .mockResolvedValueOnce({ user: authenticatedUser })
      .mockReturnValueOnce(recovery.promise);
    voucherServiceMocks.list
      .mockResolvedValueOnce([firstPrivateVoucher])
      .mockResolvedValueOnce([publicVoucher]);
    renderAuthWithVouchers();
    await expectActiveVouchers('PRIVATE-ONE:CODE-ONE');

    let recoveryRequest!: Promise<void>;
    act(() => { recoveryRequest = auth.refreshUser(); });
    await waitFor(() => expect(authServiceMocks.getCurrentUser).toHaveBeenCalledTimes(2));

    await act(async () => auth.logout());
    await expectActiveVouchers('PUBLIC:public');

    await act(async () => {
      recovery.resolve({ user: secondUser });
      await recoveryRequest;
    });

    expect(auth.user).toBeNull();
    expect(auth.viewerKey).toBe('anonymous');
    expect(screen.getByTestId('active-vouchers')).toHaveTextContent('PUBLIC:public');
    expect(voucherServiceMocks.list).toHaveBeenCalledTimes(2);
  });

  it('removes unresolved reconnect recovery when the provider unmounts', async () => {
    authServiceMocks.getCurrentUser.mockRejectedValueOnce(new ApiClientError('Network error', 0));
    const view = renderAuth();
    await waitFor(() => expect(auth.isLoading).toBe(false));

    view.unmount();
    act(() => onlineManager.setOnline(false));
    act(() => onlineManager.setOnline(true));

    expect(authServiceMocks.getCurrentUser).toHaveBeenCalledTimes(1);
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

  it('clears mounted private results without starting anonymous queries when remote logout fails', async () => {
    authServiceMocks.getCurrentUser
      .mockResolvedValueOnce({ user: authenticatedUser })
      .mockResolvedValueOnce({ user: authenticatedUser });
    authServiceMocks.signOut.mockResolvedValueOnce({ success: false, error: 'Network unavailable' });
    voucherServiceMocks.list
      .mockResolvedValueOnce([firstPrivateVoucher])
      .mockResolvedValueOnce([secondPrivateVoucher]);
    offerServiceMocks.list
      .mockResolvedValueOnce({ ...privateOfferPage, total: 1 })
      .mockResolvedValueOnce({ ...privateOfferPage, total: 2 });
    renderAuthWithViewerQueries();
    await expectActiveVouchers('PRIVATE-ONE:CODE-ONE');
    await waitFor(() => expect(screen.getByTestId('active-offers')).toHaveTextContent('1'));

    await act(async () => auth.logout());

    expect(auth.user).toBeNull();
    expect(auth.viewerKey).toBeNull();
    expect(auth.isLoading).toBe(false);
    expect(screen.getByTestId('active-vouchers')).toBeEmptyDOMElement();
    expect(screen.getByTestId('active-offers')).toBeEmptyDOMElement();
    expect(queryClient.getQueriesData({ queryKey: offersQueryKey })
      .filter(([, data]) => data !== undefined)).toEqual([]);
    expect(queryClient.getQueriesData({ queryKey: vouchersQueryKey })
      .filter(([, data]) => data !== undefined)).toEqual([]);
    expect(voucherServiceMocks.list).toHaveBeenCalledTimes(1);
    expect(offerServiceMocks.list).toHaveBeenCalledTimes(1);

    await act(async () => auth.refreshUser());

    await expectActiveVouchers('PRIVATE-TWO:CODE-TWO');
    await waitFor(() => expect(screen.getByTestId('active-offers')).toHaveTextContent('2'));
    expect(auth.user).toEqual(authenticatedUser);
    expect(auth.viewerKey).toBe(authenticatedUser.id);
    expect(voucherServiceMocks.list).toHaveBeenCalledTimes(2);
    expect(offerServiceMocks.list).toHaveBeenCalledTimes(2);
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

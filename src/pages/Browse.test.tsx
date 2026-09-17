import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOffersQuery } from '@/hooks/useOffersQuery';
import type {
  CampaignOffer,
  CommunityOffer,
  ResolvedVoucher,
  User,
  Voucher,
} from '@/lib/types';
import Browse from './Browse';

const mocks = vi.hoisted(() => ({
  claimCampaign: vi.fn(),
  openLogin: vi.fn(),
  recordCampaignView: vi.fn(),
  useAuth: vi.fn(),
  useOffersQuery: vi.fn(),
  useVouchers: vi.fn(),
}));

vi.mock('@/hooks/useOffersQuery', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useOffersQuery')>();
  return { ...actual, useOffersQuery: mocks.useOffersQuery };
});

vi.mock('@/services/offer.service', () => ({
  offerService: {
    claimCampaign: mocks.claimCampaign,
    recordCampaignView: mocks.recordCampaignView,
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mocks.useAuth(),
}));

vi.mock('@/contexts/AuthDialogContext', () => ({
  useAuthDialog: () => ({ openLogin: mocks.openLogin }),
}));

vi.mock('@/contexts/VoucherContext', () => ({
  useVouchers: mocks.useVouchers,
}));

vi.mock('@/components/VoucherCard', () => ({
  default: ({ voucher }: { voucher: Voucher }) => (
    <article>
      <p>{voucher.title}</p>
    </article>
  ),
}));

const communityOffer: CommunityOffer = {
  kind: 'community',
  id: 'community-1',
  sourceType: 'community',
  platform: 'Google Pay',
  category: undefined,
  title: 'Community reward',
  description: 'Shared reward',
  imageUrl: 'https://example.com/community.png',
  expiryDate: new Date('2026-09-01T00:00:00.000Z'),
  donatedBy: 'anonymous',
  donatedAt: new Date('2026-08-23T00:00:00.000Z'),
  isRedeemed: false,
  reportCount: 0,
  isActive: true,
};

const campaignOffer: CampaignOffer = {
  kind: 'campaign',
  id: 'campaign-1',
  title: 'Weekend Reward',
  description: 'Use this weekend',
  terms: 'One use per customer',
  platform: 'Google Pay',
  category: 'Shopping',
  imageUrl: 'https://example.com/campaign.png',
  expiryDate: new Date('2026-09-02T00:00:00.000Z'),
  brandName: 'Fresh Rewards',
  organizationName: 'Fresh Market Ltd',
  remainingCount: 3,
};

const { kind: _kind, ...claimedBase } = communityOffer;
const claimedVoucher: ResolvedVoucher = {
  ...claimedBase,
  id: 'campaign-voucher-1',
  sourceType: 'campaign',
  code: 'ASSIGNED-CODE',
  isRedeemed: true,
  redeemedBy: 'customer-1',
  redeemedAt: new Date('2026-08-23T01:00:00.000Z'),
};

const customer: User = {
  id: 'customer-1',
  email: 'customer@example.com',
  username: 'customer',
  role: 'customer',
  createdAt: new Date('2026-08-23T00:00:00.000Z'),
  redeemedVouchers: [],
};

const fetchNextPage = vi.fn();
const refetch = vi.fn();
const baseQuery = {
  isPending: false,
  isError: false,
  isFetchNextPageError: false,
  isFetchingNextPage: false,
  hasNextPage: false,
  fetchNextPage,
  refetch,
};

let queryClient: QueryClient;

const browseTree = (route = '/browse') => (
  <QueryClientProvider client={queryClient}>
    <MemoryRouter initialEntries={[route]}>
      <Browse />
    </MemoryRouter>
  </QueryClientProvider>
);

const renderBrowse = (route = '/browse') => render(browseTree(route));

const NavigationHarness = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      <button type="button" onClick={() => navigate(-1)}>go back</button>
      <output data-testid="location-search">{location.search}</output>
      <Browse />
    </>
  );
};

const setQuery = (
  overrides: Partial<ReturnType<typeof useOffersQuery>>,
) => {
  vi.mocked(useOffersQuery).mockReturnValue({
    ...baseQuery,
    ...overrides,
  } as ReturnType<typeof useOffersQuery>);
};

describe('Browse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchNextPage.mockResolvedValue(undefined);
    refetch.mockResolvedValue(undefined);
    mocks.claimCampaign.mockResolvedValue({
      voucher: claimedVoucher,
      message: 'Campaign voucher claimed',
    });
    mocks.recordCampaignView.mockResolvedValue({ recorded: true });
    mocks.useAuth.mockReturnValue({ isAuthenticated: true, user: customer });
    mocks.useVouchers.mockReturnValue({ vouchers: [], isLoading: false });
    queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
        queries: { retry: false },
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('restores URL filters and renders totals with the correct union cards', () => {
    setQuery({
      data: {
        pages: [{
          offers: [communityOffer, campaignOffer],
          total: 2,
          nextCursor: null,
          hasMore: false,
        }],
        pageParams: [null],
      },
    });

    renderBrowse('/browse?q=reward&platform=Google+Pay&category=Shopping&source=campaign&expiring=true');

    expect(screen.getByRole('status')).toHaveTextContent('2 offers found');
    expect(screen.getByText(communityOffer.title)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Weekend Reward.*view details/i })).toBeInTheDocument();
    expect(useOffersQuery).toHaveBeenCalledWith({
      q: 'reward',
      platform: 'Google Pay',
      category: 'Shopping',
      source: 'campaign',
      expiringSoon: true,
    });
  });

  it('does not let a pending search overwrite same-query history restoration', () => {
    vi.useFakeTimers();
    setQuery({
      data: {
        pages: [{ offers: [], total: 0, nextCursor: null, hasMore: false }],
        pageParams: [null],
      },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={[
            '/browse?q=saved&source=community&ref=restored',
            '/browse?q=saved&source=campaign&ref=current',
          ]}
          initialIndex={1}
        >
          <NavigationHarness />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.change(screen.getByRole('searchbox', { name: 'search offers' }), {
      target: { value: 'stale' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'go back' }));

    expect(screen.getByRole('searchbox', { name: 'search offers' })).toHaveValue('saved');
    expect(screen.getByTestId('location-search')).toHaveTextContent(
      '?q=saved&source=community&ref=restored',
    );

    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByTestId('location-search')).toHaveTextContent(
      '?q=saved&source=community&ref=restored',
    );
  });

  it('discovers offers without reading private voucher history', () => {
    setQuery({
      data: {
        pages: [{ offers: [communityOffer], total: 1, nextCursor: null, hasMore: false }],
        pageParams: [null],
      },
    });

    renderBrowse();

    expect(screen.getByText(communityOffer.title)).toBeInTheDocument();
    expect(mocks.useVouchers).not.toHaveBeenCalled();
  });

  it('de-duplicates appended pages by kind and id without hiding cross-kind ids', () => {
    const crossKindCampaign = {
      ...campaignOffer,
      id: communityOffer.id,
      title: 'Cross-kind campaign',
    };
    setQuery({
      data: {
        pages: [
          {
            offers: [communityOffer],
            total: 2,
            nextCursor: 'next',
            hasMore: true,
          },
          {
            offers: [communityOffer, crossKindCampaign],
            total: 2,
            nextCursor: null,
            hasMore: false,
          },
        ],
        pageParams: [null, 'next'],
      },
    });

    renderBrowse();

    expect(screen.getAllByText(communityOffer.title)).toHaveLength(1);
    expect(screen.getByRole('button', { name: /Cross-kind campaign.*view details/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'load more offers' })).not.toBeInTheDocument();
  });

  it('shows the exact initial loading state without an empty result', () => {
    setQuery({ isPending: true, data: undefined });

    renderBrowse();

    expect(screen.getByText('loading offers')).toHaveAttribute('role', 'status');
    expect(screen.getAllByTestId('offer-loading-placeholder')).toHaveLength(6);
    expect(screen.queryByText('no offers are available right now')).not.toBeInTheDocument();
  });

  it('retries a first-page error', async () => {
    const user = userEvent.setup();
    setQuery({ isError: true, data: undefined });
    renderBrowse();

    expect(screen.getByRole('alert')).toContainElement(
      screen.getByRole('button', { name: 'retry loading offers' }),
    );
    await user.click(screen.getByRole('button', { name: 'retry loading offers' }));

    expect(refetch).toHaveBeenCalledOnce();
  });

  it('keeps loaded offers while retrying a later-page failure', async () => {
    const user = userEvent.setup();
    setQuery({
      isError: true,
      isFetchNextPageError: true,
      hasNextPage: true,
      data: {
        pages: [{
          offers: [communityOffer],
          total: 2,
          nextCursor: 'next',
          hasMore: true,
        }],
        pageParams: [null],
      },
    });
    renderBrowse();

    expect(screen.getByText(communityOffer.title)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toContainElement(
      screen.getByRole('button', { name: 'retry loading more offers' }),
    );
    await user.click(screen.getByRole('button', { name: 'retry loading more offers' }));

    expect(fetchNextPage).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'retry loading offers' })).not.toBeInTheDocument();
  });

  it('disables load more with exact copy while the next page is fetching', () => {
    setQuery({
      isFetchingNextPage: true,
      hasNextPage: true,
      data: {
        pages: [{
          offers: [communityOffer],
          total: 2,
          nextCursor: 'next',
          hasMore: true,
        }],
        pageParams: [null],
      },
    });

    renderBrowse();

    expect(screen.getByText(communityOffer.title)).toBeInTheDocument();
    const loadingMore = screen.getByRole('button', { name: 'loading more...' });
    expect(loadingMore).toBeDisabled();
    expect(loadingMore.closest('[role="status"]')).not.toBeNull();
    expect(screen.getByTestId('load-more-label')).toHaveClass('t-text-swap');
    expect(screen.getByTestId('load-more-label')).toHaveAttribute('aria-hidden', 'true');
  });

  it('loads the next page from the active pagination control', async () => {
    const user = userEvent.setup();
    setQuery({
      hasNextPage: true,
      data: {
        pages: [{
          offers: [communityOffer],
          total: 2,
          nextCursor: 'next',
          hasMore: true,
        }],
        pageParams: [null],
      },
    });
    renderBrowse();

    await user.click(screen.getByRole('button', { name: 'load more offers' }));

    expect(fetchNextPage).toHaveBeenCalledOnce();
  });

  it('distinguishes no active inventory from an empty filtered result', async () => {
    const user = userEvent.setup();
    setQuery({
      data: {
        pages: [{ offers: [], total: 0, nextCursor: null, hasMore: false }],
        pageParams: [null],
      },
    });
    const view = renderBrowse();

    expect(screen.getByText('no offers are available right now')).toHaveAttribute('role', 'status');
    expect(screen.queryByRole('button', { name: 'clear filters' })).not.toBeInTheDocument();

    view.unmount();
    renderBrowse('/browse?source=community');
    expect(screen.getByText('no offers match these filters')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'clear filters' }));
    await waitFor(() => expect(useOffersQuery).toHaveBeenLastCalledWith({
      q: '',
      source: 'all',
      expiringSoon: false,
    }));
  });

  it('keeps claim success mounted after the campaign leaves the grid', async () => {
    const user = userEvent.setup();
    setQuery({
      data: {
        pages: [{
          offers: [campaignOffer],
          total: 1,
          nextCursor: null,
          hasMore: false,
        }],
        pageParams: [null],
      },
    });
    const view = renderBrowse();
    await user.click(screen.getByRole('button', { name: /Weekend Reward.*view details/i }));
    await user.click(screen.getByRole('button', { name: 'claim from campaign' }));
    expect(await screen.findByText('ASSIGNED-CODE')).toBeInTheDocument();

    setQuery({
      data: {
        pages: [{ offers: [], total: 0, nextCursor: null, hasMore: false }],
        pageParams: [null],
      },
    });
    view.rerender(browseTree());

    expect(screen.queryByRole('button', { name: /Weekend Reward.*view details/i })).not.toBeInTheDocument();
    expect(screen.getByText('ASSIGNED-CODE')).toBeInTheDocument();

    const fallback = screen.getByText('0 offers found');
    await user.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => expect(fallback).toHaveFocus());
  });
});

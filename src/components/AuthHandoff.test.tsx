import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import type { CampaignOffer, Voucher } from '@/lib/types';
import { AuthDialogProvider } from '@/contexts/AuthDialogContext';
import { CampaignOfferCard, CampaignOfferDialog } from './CampaignOfferCard';
import Sidebar from './Sidebar';
import VoucherCard from './VoucherCard';

const redeemVoucher = vi.fn();
const reportVoucher = vi.fn();
const retryVouchers = vi.fn();
const campaignService = vi.hoisted(() => ({
  claimCampaign: vi.fn(),
  recordCampaignView: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    isLoading: false,
    user: null,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('@/contexts/VoucherContext', () => ({
  useVouchers: () => ({ redeemVoucher, reportVoucher, retryVouchers }),
}));

vi.mock('@/services/offer.service', () => ({
  offerService: {
    claimCampaign: campaignService.claimCampaign,
    recordCampaignView: campaignService.recordCampaignView,
  },
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'dark', setTheme: vi.fn() }),
}));

const voucher: Voucher = {
  id: 'voucher-1',
  platform: 'Google Pay',
  title: 'Food Reward',
  description: 'Valid on one order',
  code: 'FOOD50',
  imageUrl: 'https://example.com/voucher.png',
  donatedBy: 'donor-1',
  donatedAt: new Date('2026-08-10T00:00:00Z'),
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
  expiryDate: new Date('2026-09-01T00:00:00.000Z'),
  brandName: 'Fresh Rewards',
  organizationName: 'Fresh Market Ltd',
  remainingCount: 3,
};

function CampaignHarness({ showCampaign = true }: { showCampaign?: boolean }) {
  const [open, setOpen] = useState(false);
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null);
  const focusFallback = useRef<HTMLOutputElement>(null);

  return (
    <>
      <output ref={focusFallback} tabIndex={-1}>
        {showCampaign ? '1 offer found' : '0 offers found'}
      </output>
      {showCampaign && (
        <CampaignOfferCard
          offer={campaignOffer}
          onOpen={(_offer, nextTrigger) => {
            setTrigger(nextTrigger);
            setOpen(true);
          }}
        />
      )}
      <CampaignOfferDialog
        offer={campaignOffer}
        open={open}
        trigger={trigger}
        focusFallback={focusFallback.current}
        onOpenChange={setOpen}
      />
    </>
  );
}

function renderWithAuth(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  const tree = (content: React.ReactNode) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthDialogProvider>{content}</AuthDialogProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
  const view = render(tree(ui));

  return {
    ...view,
    rerenderWithAuth(content: React.ReactNode) {
      view.rerender(tree(content));
    },
  };
}

describe('dialog-to-auth handoff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    campaignService.recordCampaignView.mockResolvedValue({ recorded: true });
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  it('waits for the drawer closing boundary, focuses auth, then returns to the menu button', async () => {
    const user = userEvent.setup();
    renderWithAuth(<Sidebar />);

    const menu = screen.getByRole('button', { name: 'open menu' });
    await user.click(menu);
    await user.click(screen.getByRole('button', { name: 'log in' }));

    const email = await screen.findByRole('textbox', { name: 'email' });
    expect(screen.queryByRole('dialog', { name: 'vouchit navigation' })).not.toBeInTheDocument();
    await waitFor(() => expect(email).toHaveFocus());

    await user.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(menu).toHaveFocus());
  });

  it('waits for voucher details to close, focuses auth, then returns to the voucher card', async () => {
    const user = userEvent.setup();
    renderWithAuth(<VoucherCard voucher={voucher} />);

    const card = screen.getByRole('button', { name: /Food Reward.*view details/ });
    await user.click(card);
    await user.click(screen.getByRole('button', { name: 'sign in to redeem' }));

    const email = await screen.findByRole('textbox', { name: 'email' });
    expect(screen.queryByText('sign in to view details')).not.toBeInTheDocument();
    await waitFor(() => expect(email).toHaveFocus());

    await user.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(card).toHaveFocus());
  });

  it('waits for campaign details to close, focuses shared auth, then returns to the campaign card', async () => {
    const user = userEvent.setup();
    renderWithAuth(<CampaignHarness />);

    const card = screen.getByRole('button', { name: /Weekend Reward.*view details/ });
    await user.click(card);
    await user.click(screen.getByRole('button', { name: 'sign in to claim' }));

    const email = await screen.findByRole('textbox', { name: 'email' });
    expect(screen.queryByRole('dialog', { name: 'Weekend Reward' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    await waitFor(() => expect(email).toHaveFocus());

    await user.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(card).toHaveFocus());
  });

  it('returns auth focus to the catalog when the campaign trigger detaches before handoff', async () => {
    const user = userEvent.setup();
    const view = renderWithAuth(<CampaignHarness />);

    const card = screen.getByRole('button', { name: /Weekend Reward.*view details/ });
    await user.click(card);
    view.rerenderWithAuth(<CampaignHarness showCampaign={false} />);
    expect(card.isConnected).toBe(false);

    await user.click(screen.getByRole('button', { name: 'sign in to claim' }));

    const email = await screen.findByRole('textbox', { name: 'email' });
    expect(screen.queryByRole('dialog', { name: 'Weekend Reward' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    await waitFor(() => expect(email).toHaveFocus());

    const fallback = screen.getByText('0 offers found');
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(fallback).toHaveFocus());
  });
});

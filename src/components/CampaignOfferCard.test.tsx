import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CampaignOffer, ResolvedVoucher, User } from '@/lib/types';
import { ApiClientError } from '@/services/api-client';
import { CampaignOfferCard, CampaignOfferDialog } from './CampaignOfferCard';

const mocks = vi.hoisted(() => ({
  claimCampaign: vi.fn(),
  logger: { error: vi.fn() },
  openLogin: vi.fn(),
  recordCampaignView: vi.fn(),
  toast: { error: vi.fn(), success: vi.fn() },
  useAuth: vi.fn(),
}));

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

vi.mock('@/utils/toast', () => ({ toast: mocks.toast }));
vi.mock('@/utils/logger', () => ({
  createLogger: () => mocks.logger,
  logger: mocks.logger,
}));

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

const customer: User = {
  id: 'customer-1',
  email: 'customer@example.com',
  username: 'customer',
  role: 'customer',
  createdAt: new Date('2026-08-23T00:00:00.000Z'),
  redeemedVouchers: [],
};

const business: User = {
  ...customer,
  id: 'business-1',
  email: 'business@example.com',
  username: 'business',
  role: 'business',
};

const claimedVoucher: ResolvedVoucher = {
  id: 'campaign-voucher-1',
  sourceType: 'campaign',
  platform: 'Google Pay',
  title: campaignOffer.title,
  description: campaignOffer.description,
  code: 'ASSIGNED-CODE',
  imageUrl: campaignOffer.imageUrl,
  expiryDate: campaignOffer.expiryDate,
  donatedBy: 'business-1',
  donatedAt: new Date('2026-08-20T00:00:00.000Z'),
  isRedeemed: true,
  redeemedBy: customer.id,
  redeemedAt: new Date('2026-08-23T01:00:00.000Z'),
  reportCount: 0,
  isActive: true,
  category: 'Shopping',
};

const claimResponse = {
  voucher: claimedVoucher,
  message: 'Campaign voucher claimed',
};

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
}

function DialogHarness({
  offer,
  trigger,
}: {
  offer: CampaignOffer;
  trigger: HTMLButtonElement;
}) {
  const [open, setOpen] = useState(true);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>reopen campaign details</button>
      <CampaignOfferDialog
        offer={offer}
        open={open}
        trigger={trigger}
        onOpenChange={setOpen}
      />
    </>
  );
}

function renderCampaignDialog({
  user,
  offer = campaignOffer,
  queryClient = createQueryClient(),
}: {
  user: User | null;
  offer?: CampaignOffer;
  queryClient?: QueryClient;
}) {
  let currentOffer = offer;
  let currentUser = user;
  mocks.useAuth.mockImplementation(() => ({
    isAuthenticated: currentUser !== null,
    user: currentUser,
  }));
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.textContent = 'campaign card trigger';
  document.body.append(trigger);

  const dialog = () => (
    <QueryClientProvider client={queryClient}>
      <DialogHarness offer={currentOffer} trigger={trigger} />
    </QueryClientProvider>
  );
  const view = render(dialog());

  return {
    ...view,
    queryClient,
    trigger,
    rerenderOffer(nextOffer: CampaignOffer) {
      currentOffer = nextOffer;
      view.rerender(dialog());
    },
    rerenderUser(nextUser: User | null) {
      currentUser = nextUser;
      view.rerender(dialog());
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

describe('CampaignOfferCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.claimCampaign.mockReset().mockResolvedValue(claimResponse);
    mocks.recordCampaignView.mockReset().mockResolvedValue({ recorded: true });
    mocks.useAuth.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('presents one grouped campaign with attribution and inventory', async () => {
    const user = userEvent.setup();
    const openDialog = vi.fn();
    render(<CampaignOfferCard offer={campaignOffer} onOpen={openDialog} />);

    const trigger = screen.getByRole('button', {
      name: /business campaign.*Fresh Market Ltd.*Fresh Rewards.*3 available.*Weekend Reward.*Google Pay.*Shopping.*Use this weekend.*expires Sep 1.*view details/i,
    });
    expect(trigger).toHaveTextContent('business campaign');
    expect(trigger).toHaveTextContent('Google Pay');
    expect(trigger).toHaveTextContent('Shopping');
    expect(trigger).toHaveTextContent('Fresh Market Ltd');
    expect(trigger).toHaveTextContent('Fresh Rewards');
    expect(trigger).toHaveTextContent('3 available');

    await user.click(trigger);
    expect(openDialog).toHaveBeenCalledWith(campaignOffer, trigger);
  });

  it('exposes campaign attribution, inventory, description, terms, and expiry in labelled details', () => {
    renderCampaignDialog({ user: null });

    const dialog = screen.getByRole('dialog', { name: 'Weekend Reward' });
    expect(within(dialog).getByRole('region', { name: 'description' }))
      .toHaveTextContent('Use this weekend');
    expect(within(dialog).getByRole('region', { name: 'terms' }))
      .toHaveTextContent('One use per customer');
    expect(dialog).toHaveTextContent('Fresh Market Ltd');
    expect(dialog).toHaveTextContent('Fresh Rewards');
    expect(dialog).toHaveTextContent('Google Pay');
    expect(dialog).toHaveTextContent('Shopping');
    expect(dialog).toHaveTextContent('Sep 1, 2026');
    expect(dialog).toHaveTextContent('3 available');
  });

  it('hands an anonymous claim to shared auth after closing details', async () => {
    const user = userEvent.setup();
    const { trigger } = renderCampaignDialog({ user: null });

    await user.click(screen.getByRole('button', { name: 'sign in to claim' }));

    await waitFor(() => expect(mocks.openLogin).toHaveBeenCalledWith(trigger));
    expect(screen.queryByRole('dialog', { name: 'Weekend Reward' })).not.toBeInTheDocument();
    expect(mocks.claimCampaign).not.toHaveBeenCalled();
  });

  it('keeps customer claim actions out of business accounts', () => {
    renderCampaignDialog({ user: business });

    expect(screen.getByText('use a customer account to claim')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'claim from campaign' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'sign in to claim' })).not.toBeInTheDocument();
  });

  it('prevents a second claim while the first request is pending', async () => {
    const user = userEvent.setup();
    const pending = deferred<typeof claimResponse>();
    mocks.claimCampaign.mockReturnValue(pending.promise);
    renderCampaignDialog({ user: customer });

    await user.click(screen.getByRole('button', { name: 'claim from campaign' }));

    const pendingButton = screen.getByRole('button', { name: 'claiming from campaign…' });
    expect(pendingButton).toBeDisabled();
    await user.click(pendingButton);
    expect(mocks.claimCampaign).toHaveBeenCalledOnce();

    pending.resolve(claimResponse);
    expect(await screen.findByText('ASSIGNED-CODE')).toBeInTheDocument();
  });

  it('keeps the assigned code visible while offer queries refresh', async () => {
    const user = userEvent.setup();
    const queryClient = createQueryClient();
    const refresh = deferred<void>();
    vi.spyOn(queryClient, 'invalidateQueries').mockReturnValue(refresh.promise);
    renderCampaignDialog({ user: customer, queryClient });

    await user.click(screen.getByRole('button', { name: 'claim from campaign' }));

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('campaign voucher claimed, assigned code ASSIGNED-CODE');
    const copy = screen.getByRole('button', { name: 'copy assigned code ASSIGNED-CODE' });
    expect(copy).toBeEnabled();
    expect(copy).toHaveFocus();
    expect(mocks.claimCampaign.mock.calls[0]?.[0]).toBe(campaignOffer.id);
    refresh.resolve();
  });

  it.each([
    ['logout', null],
    ['account switch', { ...customer, id: 'customer-2', email: 'other@example.com' }],
  ] as const)('clears an assigned code after a viewer %s', async (_label, nextUser) => {
    const user = userEvent.setup();
    const view = renderCampaignDialog({ user: customer });
    await user.click(screen.getByRole('button', { name: 'claim from campaign' }));
    expect(await screen.findByText('ASSIGNED-CODE')).toBeInTheDocument();

    view.rerenderUser(nextUser);

    await waitFor(() => expect(screen.queryByText('ASSIGNED-CODE')).not.toBeInTheDocument());
    expect(screen.getByRole('button', {
      name: nextUser ? 'claim from campaign' : 'sign in to claim',
    })).toBeEnabled();
  });

  it('clears a claim conflict after a viewer change', async () => {
    const user = userEvent.setup();
    mocks.claimCampaign.mockRejectedValue(new ApiClientError('conflict', 409));
    const view = renderCampaignDialog({ user: customer });
    await user.click(screen.getByRole('button', { name: 'claim from campaign' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('already claimed');

    view.rerenderUser({ ...customer, id: 'customer-2', email: 'other@example.com' });

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'claim from campaign' })).toBeEnabled();
  });

  it('resets an assigned code only after close or selecting a different campaign', async () => {
    const user = userEvent.setup();
    const view = renderCampaignDialog({ user: customer });
    await user.click(screen.getByRole('button', { name: 'claim from campaign' }));
    expect(await screen.findByText('ASSIGNED-CODE')).toBeInTheDocument();

    view.rerenderOffer({ ...campaignOffer, remainingCount: 2 });
    expect(screen.getByText('ASSIGNED-CODE')).toBeInTheDocument();

    view.rerenderOffer({
      ...campaignOffer,
      id: 'campaign-2',
      title: 'Weekday Reward',
    });
    await waitFor(() => expect(screen.queryByText('ASSIGNED-CODE')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'claim from campaign' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'claim from campaign' }));
    expect(await screen.findByText('ASSIGNED-CODE')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(view.trigger).toHaveFocus());
    await user.click(screen.getByRole('button', { name: 'reopen campaign details' }));
    expect(screen.queryByText('ASSIGNED-CODE')).not.toBeInTheDocument();
  });

  it('retains details and explains an unavailable campaign conflict', async () => {
    const user = userEvent.setup();
    mocks.claimCampaign.mockRejectedValue(new ApiClientError('conflict', 409));
    renderCampaignDialog({ user: customer });

    await user.click(screen.getByRole('button', { name: 'claim from campaign' }));

    expect(await screen.findByText('this campaign is already claimed or no longer available'))
      .toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Weekend Reward' })).toHaveTextContent('Use this weekend');
    expect(screen.queryByRole('button', { name: 'claim from campaign' })).not.toBeInTheDocument();
    expect(mocks.toast.error).not.toHaveBeenCalled();
  });

  it('keeps a non-conflict failure retryable without exposing a code', async () => {
    const user = userEvent.setup();
    mocks.claimCampaign
      .mockRejectedValueOnce(new Error('network failure'))
      .mockResolvedValueOnce(claimResponse);
    renderCampaignDialog({ user: customer });

    await user.click(screen.getByRole('button', { name: 'claim from campaign' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('failed to claim campaign voucher, please try again');
    expect(screen.queryByText('ASSIGNED-CODE')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'claim from campaign' })).toBeEnabled();
    expect(mocks.toast.error).toHaveBeenCalledWith('failed to claim campaign voucher');

    await user.click(screen.getByRole('button', { name: 'claim from campaign' }));
    expect(await screen.findByText('ASSIGNED-CODE')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('uses incumbent success and failure toasts when copying the assigned code', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('denied'));
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    renderCampaignDialog({ user: customer });
    await user.click(screen.getByRole('button', { name: 'claim from campaign' }));
    const copy = await screen.findByRole('button', { name: 'copy assigned code ASSIGNED-CODE' });

    await user.click(copy);
    expect(writeText).toHaveBeenCalledWith('ASSIGNED-CODE');
    expect(mocks.toast.success).toHaveBeenCalledWith('code copied');

    await user.click(copy);
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith('failed to copy code'));
    expect(mocks.logger.error).toHaveBeenCalledWith(
      'Error copying campaign code',
      expect.any(Error),
      { campaignId: campaignOffer.id },
    );
  });

  it('records one nonblocking view per closed-to-open transition', async () => {
    const user = userEvent.setup();
    const viewFailure = new Error('view failed');
    mocks.recordCampaignView.mockRejectedValue(viewFailure);
    const view = renderCampaignDialog({ user: null });

    expect(screen.getByRole('dialog', { name: 'Weekend Reward' })).toBeInTheDocument();
    await waitFor(() => expect(mocks.recordCampaignView).toHaveBeenCalledOnce());
    expect(mocks.recordCampaignView).toHaveBeenCalledWith(campaignOffer.id);
    expect(mocks.logger.error).toHaveBeenCalledWith(
      'Error recording campaign offer view',
      viewFailure,
      { campaignId: campaignOffer.id },
    );
    expect(mocks.toast.error).not.toHaveBeenCalled();

    view.rerenderOffer({ ...campaignOffer, remainingCount: 2 });
    expect(mocks.recordCampaignView).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: 'Close' }));
    await user.click(screen.getByRole('button', { name: 'reopen campaign details' }));
    await waitFor(() => expect(mocks.recordCampaignView).toHaveBeenCalledTimes(2));
  });
});

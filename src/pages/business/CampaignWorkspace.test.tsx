import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CampaignDraftInput, CampaignWorkspace as CampaignWorkspaceData } from '@/lib/types';
import CampaignWorkspace from './CampaignWorkspace';

const queryState = vi.hoisted(() => ({
  data: undefined as CampaignWorkspaceData | undefined,
  isLoading: false,
  error: null as Error | null,
  refetch: vi.fn(),
}));
const createMutation = vi.hoisted(() => ({ mutateAsync: vi.fn(), isPending: false }));
const updateMutation = vi.hoisted(() => ({ mutateAsync: vi.fn(), isPending: false }));
const issueMutation = vi.hoisted(() => ({ mutateAsync: vi.fn(), isPending: false }));
const settlementMutation = vi.hoisted(() => ({ mutateAsync: vi.fn(), isPending: false }));
const detailsProps = vi.hoisted(() => ({ disabled: false }));
const importProps = vi.hoisted(() => ({ onConfirmed: null as (() => void) | null, disabled: false }));

vi.mock('@/hooks/useBusinessQueries', () => ({
  useBusinessCampaignQuery: () => queryState,
  useCreateCampaignMutation: () => createMutation,
  useUpdateCampaignMutation: () => updateMutation,
  useIssueInvoiceMutation: () => issueMutation,
  useRecordSettlementMutation: () => settlementMutation,
}));
vi.mock('@/components/business/CampaignDetailsForm', () => ({
  default: function MockCampaignDetailsForm(props: { initialValues?: Partial<CampaignDraftInput>; onSubmit: (input: CampaignDraftInput) => void; disabled?: boolean }) {
    const [title] = useState(props.initialValues?.title ?? '');
    detailsProps.disabled = Boolean(props.disabled);
    return <button onClick={() => void props.onSubmit({} as CampaignDraftInput)}>save details mock {title}</button>;
  },
}));
vi.mock('@/components/business/CampaignInventoryImport', () => ({
  default: (props: { onConfirmed?: () => void; disabled?: boolean }) => {
    importProps.onConfirmed = props.onConfirmed ?? vi.fn();
    importProps.disabled = Boolean(props.disabled);
    return <div>inventory import mock</div>;
  },
}));

const workspace: CampaignWorkspaceData = {
  campaign: {
    id: 'campaign-1',
    businessId: 'business-1',
    businessProfileId: 'profile-1',
    organizationName: 'Fresh Market',
    title: 'Save on groceries',
    brandName: 'Fresh Market',
    description: 'A grocery offer',
    terms: 'One use per customer',
    platform: 'Google Pay',
    category: 'Shopping',
    imageUrl: 'https://example.com/offer.png',
    expiryDate: new Date('2026-09-01T00:00:00Z'),
    status: 'draft',
    effectiveStatus: 'draft',
    createdAt: new Date('2026-08-19T00:00:00Z'),
    updatedAt: new Date('2026-08-19T00:00:00Z'),
  },
  inventoryCount: 2,
  invoice: null,
  analytics: null,
};

const renderWorkspace = (entry: string) => render(
  <MemoryRouter initialEntries={[entry]}>
    <Routes>
      <Route path="/business/campaigns/new" element={<CampaignWorkspace />} />
      <Route path="/business/campaigns/:id" element={<CampaignWorkspace />} />
    </Routes>
  </MemoryRouter>,
);

describe('CampaignWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryState.data = workspace;
    queryState.refetch.mockResolvedValue(undefined);
    createMutation.mutateAsync.mockImplementation(async () => {
      queryState.data = workspace;
      return workspace;
    });
    updateMutation.mutateAsync.mockResolvedValue(workspace);
    issueMutation.mutateAsync.mockResolvedValue(workspace.invoice);
  });

  it('derives the inventory stage from server workspace data and renders all semantic stages', () => {
    renderWorkspace('/business/campaigns/campaign-1');

    expect(screen.getByRole('heading', { name: /save on groceries/i })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: /campaign stages/i })).toHaveTextContent(/details.*inventory.*invoice.*active/i);
    expect(screen.getByRole('listitem', { name: /inventory/i })).toHaveAttribute('aria-current', 'step');
  });

  it('creates a draft before navigating to its workspace', async () => {
    const user = userEvent.setup();
    queryState.data = undefined;
    renderWorkspace('/business/campaigns/new');

    await user.click(screen.getByRole('button', { name: 'save details mock' }));

    expect(createMutation.mutateAsync).toHaveBeenCalledWith({});
    expect(await screen.findByRole('button', { name: 'save details mock Save on groceries' })).toBeInTheDocument();
    expect(screen.getByText('inventory import mock')).toBeInTheDocument();
  });

  it('locks details and import controls when the server returns lockedAt', () => {
    queryState.data = {
      ...workspace,
      campaign: { ...workspace.campaign, lockedAt: new Date('2026-08-19T02:00:00Z') },
    };
    renderWorkspace('/business/campaigns/campaign-1');

    expect(detailsProps.disabled).toBe(true);
    expect(importProps.disabled).toBe(true);
  });

  it('refetches the workspace after inventory confirmation', async () => {
    renderWorkspace('/business/campaigns/campaign-1');

    importProps.onConfirmed();

    expect(queryState.refetch).toHaveBeenCalledTimes(1);
  });

  it('offers invoice issuance after inventory is ready', async () => {
    const user = userEvent.setup();
    renderWorkspace('/business/campaigns/campaign-1');

    await user.click(screen.getByRole('button', { name: 'issue invoice' }));

    expect(issueMutation.mutateAsync).toHaveBeenCalledWith('campaign-1');
  });

  it('renders invoice and settlement stages from issued server data', () => {
    queryState.data = {
      ...workspace,
      campaign: { ...workspace.campaign, status: 'awaiting_payment', effectiveStatus: 'awaiting_payment' },
      invoice: {
        id: 'invoice-1',
        campaignId: 'campaign-1',
        businessId: 'business-1',
        priceVersion: 'v1',
        currency: 'INR',
        baseFeePaise: 9900,
        perVoucherFeePaise: 200,
        quantity: 2,
        totalPaise: 10300,
        status: 'issued',
        issuedAt: new Date('2026-08-19T03:00:00.000Z'),
      },
    };

    renderWorkspace('/business/campaigns/campaign-1');

    expect(screen.getByRole('listitem', { name: /invoice/i })).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('heading', { name: 'campaign invoice' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'record external payment' })).toBeInTheDocument();
  });

  it('keeps paid payment audit data visible after workspace query refresh', () => {
    queryState.data = {
      ...workspace,
      campaign: { ...workspace.campaign, status: 'active', effectiveStatus: 'active' },
      invoice: {
        id: 'invoice-1',
        campaignId: 'campaign-1',
        businessId: 'business-1',
        priceVersion: 'v1',
        currency: 'INR',
        baseFeePaise: 9900,
        perVoucherFeePaise: 200,
        quantity: 2,
        totalPaise: 10300,
        status: 'paid',
        issuedAt: new Date('2026-08-19T03:00:00.000Z'),
        paidAt: new Date('2026-08-19T06:00:00.000Z'),
        externalPaymentReference: 'BANK-WORKSPACE-001',
        externalPaymentDate: new Date('2026-08-19T23:59:59.999Z'),
      },
    };

    renderWorkspace('/business/campaigns/campaign-1');

    expect(screen.getByText('BANK-WORKSPACE-001')).toBeInTheDocument();
    expect(screen.getByText(/11:59 pm/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'record external payment' })).not.toBeInTheDocument();
  });
});

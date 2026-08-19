import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from './api-client';
import { businessService } from './business.service';
import type {
  CampaignDraftInput,
  CampaignInventoryCandidate,
  CampaignInventoryRejection,
  CampaignWorkspace,
  SettlementInput,
} from '@/lib/types';

vi.mock('./api-client', () => ({
  apiRequest: vi.fn(),
}));

const mockedApiRequest = vi.mocked(apiRequest);

const draftInput: CampaignDraftInput = {
  title: 'Save on groceries',
  brandName: 'Fresh Market',
  description: 'A grocery offer',
  terms: 'One use per customer',
  platform: 'Google Pay',
  category: 'Shopping',
  imageUrl: 'https://example.com/campaign.png',
  expiryDate: '2026-09-01T00:00:00.000Z',
};

const rows: CampaignInventoryCandidate[] = [
  { sourceRow: 2, code: 'SAVE50', value: '₹50' },
];

const blankCodeRejection: CampaignInventoryRejection = {
  sourceRow: 3,
  reason: 'Code is required',
};

const campaignDates = {
  expiryDate: '2026-09-01T00:00:00.000Z',
  createdAt: '2026-08-19T00:00:00.000Z',
  updatedAt: '2026-08-19T01:00:00.000Z',
  lockedAt: '2026-08-19T02:00:00.000Z',
};

const apiCampaign = {
  id: 'campaign-1',
  businessId: 'business-1',
  businessProfileId: 'profile-1',
  organizationName: 'Fresh Market',
  ...draftInput,
  ...campaignDates,
  status: 'draft' as const,
  effectiveStatus: 'draft' as const,
};

const apiInvoice = {
  id: 'invoice-1',
  campaignId: 'campaign-1',
  businessId: 'business-1',
  priceVersion: 'v1' as const,
  currency: 'INR' as const,
  baseFeePaise: 1000,
  perVoucherFeePaise: 100,
  quantity: 1,
  totalPaise: 1100,
  status: 'issued' as const,
  issuedAt: '2026-08-19T03:00:00.000Z',
  paidAt: '2026-08-19T04:00:00.000Z',
  externalPaymentDate: '2026-08-19T05:00:00.000Z',
};

const apiWorkspace = {
  ...apiCampaign,
  inventoryCount: 1,
  invoice: apiInvoice,
  analytics: null,
};

const expectHydratedWorkspace = (workspace: CampaignWorkspace) => {
  expect(workspace.campaign.expiryDate).toEqual(new Date(campaignDates.expiryDate));
  expect(workspace.campaign.createdAt).toEqual(new Date(campaignDates.createdAt));
  expect(workspace.campaign.updatedAt).toEqual(new Date(campaignDates.updatedAt));
  expect(workspace.campaign.lockedAt).toEqual(new Date(campaignDates.lockedAt));
  expect(workspace.invoice?.issuedAt).toEqual(new Date(apiInvoice.issuedAt));
  expect(workspace.invoice?.paidAt).toEqual(new Date(apiInvoice.paidAt));
  expect(workspace.invoice?.externalPaymentDate).toEqual(new Date(apiInvoice.externalPaymentDate));
};

describe('business service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls every business campaign and invoice endpoint with the canonical body', async () => {
    mockedApiRequest
      .mockResolvedValueOnce({ campaigns: [apiWorkspace] })
      .mockResolvedValueOnce({ campaign: apiWorkspace })
      .mockResolvedValueOnce({ campaign: apiWorkspace })
      .mockResolvedValueOnce({ campaign: apiWorkspace })
      .mockResolvedValueOnce({
        preview: { accepted: rows, rejected: [blankCodeRejection], totalRows: 2 },
      })
      .mockResolvedValueOnce({ campaign: apiWorkspace })
      .mockResolvedValueOnce({ invoice: apiInvoice })
      .mockResolvedValueOnce({ invoices: [apiInvoice] })
      .mockResolvedValueOnce({ invoice: apiInvoice, campaign: apiCampaign });

    const listed = await businessService.listCampaigns();
    const created = await businessService.createCampaign(draftInput);
    const fetched = await businessService.getCampaign('campaign-1');
    const updated = await businessService.updateCampaign('campaign-1', draftInput);
    const preview = await businessService.previewInventory('campaign-1', { headers: ['code', 'value'], rows });
    const replaced = await businessService.replaceInventory('campaign-1', rows);
    const issued = await businessService.issueInvoice('campaign-1');
    const invoices = await businessService.listInvoices();
    const settlementInput: SettlementInput = {
      amountPaise: 1100,
      externalPaymentReference: 'PAY-1',
      externalPaymentDate: '2026-08-19T05:00:00.000Z',
    };
    const settled = await businessService.recordSettlement('invoice-1', settlementInput);

    expect(listed).toHaveLength(1);
    expectHydratedWorkspace(listed[0]);
    expectHydratedWorkspace(created);
    expectHydratedWorkspace(fetched);
    expectHydratedWorkspace(updated);
    expect(preview).toEqual({
      accepted: rows,
      rejected: [{ sourceRow: 3, reason: 'Code is required' }],
      totalRows: 2,
    });
    expectHydratedWorkspace(replaced);
    expect(issued.issuedAt).toEqual(new Date(apiInvoice.issuedAt));
    expect(invoices[0].issuedAt).toEqual(new Date(apiInvoice.issuedAt));
    expect(settled.invoice.externalPaymentDate).toEqual(new Date(apiInvoice.externalPaymentDate));
    expect(settled.campaign.expiryDate).toEqual(new Date(campaignDates.expiryDate));

    expect(mockedApiRequest).toHaveBeenNthCalledWith(1, '/api/business/campaigns');
    expect(mockedApiRequest).toHaveBeenNthCalledWith(2, '/api/business/campaigns', {
      method: 'POST',
      body: JSON.stringify(draftInput),
    });
    expect(mockedApiRequest).toHaveBeenNthCalledWith(3, '/api/business/campaigns/campaign-1');
    expect(mockedApiRequest).toHaveBeenNthCalledWith(4, '/api/business/campaigns/campaign-1', {
      method: 'PATCH',
      body: JSON.stringify(draftInput),
    });
    expect(mockedApiRequest).toHaveBeenNthCalledWith(5, '/api/business/campaigns/campaign-1/inventory/preview', {
      method: 'POST',
      body: JSON.stringify({ headers: ['code', 'value'], rows }),
    });
    expect(mockedApiRequest).toHaveBeenNthCalledWith(6, '/api/business/campaigns/campaign-1/inventory', {
      method: 'PUT',
      body: JSON.stringify({ rows }),
    });
    expect(mockedApiRequest).toHaveBeenNthCalledWith(7, '/api/business/campaigns/campaign-1/invoice', {
      method: 'POST',
    });
    expect(mockedApiRequest).toHaveBeenNthCalledWith(8, '/api/business/invoices');
    expect(mockedApiRequest).toHaveBeenNthCalledWith(9, '/api/business/invoices/invoice-1/settlement', {
      method: 'POST',
      body: JSON.stringify(settlementInput),
    });
  });

  it('hydrates nullable invoice and analytics workspace fields without fabricating values', async () => {
    mockedApiRequest.mockResolvedValue({
      campaign: {
        ...apiCampaign,
        lockedAt: undefined,
        inventoryCount: 0,
        invoice: null,
        analytics: null,
      },
    });

    const workspace = await businessService.getCampaign('campaign-1');

    expect(workspace.invoice).toBeNull();
    expect(workspace.analytics).toBeNull();
    expect(workspace.campaign.lockedAt).toBeUndefined();
  });
});

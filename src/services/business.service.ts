import type {
  Campaign,
  CampaignAnalytics,
  CampaignDraftInput,
  CampaignInventoryCandidate,
  CampaignInventoryPreview,
  CampaignSummary,
  CampaignWorkspace,
  Invoice,
  SettlementInput,
} from '@/lib/types';
import { apiRequest } from './api-client';

type ApiCampaign = Omit<Campaign, 'expiryDate' | 'lockedAt' | 'createdAt' | 'updatedAt'> & {
  expiryDate: string | Date;
  lockedAt?: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

type ApiInvoice = Omit<Invoice, 'issuedAt' | 'paidAt' | 'externalPaymentDate'> & {
  issuedAt: string | Date;
  paidAt?: string | Date | null;
  externalPaymentDate?: string | Date | null;
};

type ApiCampaignWorkspace = ApiCampaign & {
  inventoryCount: number;
  invoice: ApiInvoice | null;
  analytics: CampaignAnalytics | null;
};

const hydrateCampaign = (campaign: ApiCampaign): Campaign => {
  const { expiryDate, lockedAt, createdAt, updatedAt, ...rest } = campaign;
  return {
    ...rest,
    expiryDate: new Date(expiryDate),
    ...(lockedAt ? { lockedAt: new Date(lockedAt) } : {}),
    createdAt: new Date(createdAt),
    updatedAt: new Date(updatedAt),
  };
};

const hydrateInvoice = (invoice: ApiInvoice): Invoice => {
  const { issuedAt, paidAt, externalPaymentDate, ...rest } = invoice;
  return {
    ...rest,
    issuedAt: new Date(issuedAt),
    ...(paidAt ? { paidAt: new Date(paidAt) } : {}),
    ...(externalPaymentDate ? { externalPaymentDate: new Date(externalPaymentDate) } : {}),
  };
};

const hydrateWorkspace = (workspace: ApiCampaignWorkspace): CampaignWorkspace => {
  const { inventoryCount, invoice, analytics, ...campaign } = workspace;
  return {
    campaign: hydrateCampaign(campaign),
    inventoryCount,
    invoice: invoice ? hydrateInvoice(invoice) : null,
    analytics,
  };
};

export const businessService = {
  async listCampaigns(): Promise<CampaignSummary[]> {
    const { campaigns } = await apiRequest<{ campaigns: ApiCampaignWorkspace[] }>('/api/business/campaigns');
    return campaigns.map(hydrateWorkspace);
  },

  async createCampaign(input: CampaignDraftInput): Promise<CampaignWorkspace> {
    const { campaign } = await apiRequest<{ campaign: ApiCampaignWorkspace }>('/api/business/campaigns', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return hydrateWorkspace(campaign);
  },

  async getCampaign(id: string): Promise<CampaignWorkspace> {
    const { campaign } = await apiRequest<{ campaign: ApiCampaignWorkspace }>(`/api/business/campaigns/${id}`);
    return hydrateWorkspace(campaign);
  },

  async updateCampaign(id: string, input: CampaignDraftInput): Promise<CampaignWorkspace> {
    const { campaign } = await apiRequest<{ campaign: ApiCampaignWorkspace }>(`/api/business/campaigns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    return hydrateWorkspace(campaign);
  },

  async previewInventory(
    id: string,
    input: { headers: string[]; rows: CampaignInventoryCandidate[] },
  ): Promise<CampaignInventoryPreview> {
    const { preview } = await apiRequest<{ preview: CampaignInventoryPreview }>(
      `/api/business/campaigns/${id}/inventory/preview`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
    return preview;
  },

  async replaceInventory(id: string, rows: CampaignInventoryCandidate[]): Promise<CampaignWorkspace> {
    const { campaign } = await apiRequest<{ campaign: ApiCampaignWorkspace }>(
      `/api/business/campaigns/${id}/inventory`,
      {
        method: 'PUT',
        body: JSON.stringify({ rows }),
      },
    );
    return hydrateWorkspace(campaign);
  },

  async issueInvoice(id: string): Promise<Invoice> {
    const { invoice } = await apiRequest<{ invoice: ApiInvoice }>(`/api/business/campaigns/${id}/invoice`, {
      method: 'POST',
    });
    return hydrateInvoice(invoice);
  },

  async listInvoices(): Promise<Invoice[]> {
    const { invoices } = await apiRequest<{ invoices: ApiInvoice[] }>('/api/business/invoices');
    return invoices.map(hydrateInvoice);
  },

  async recordSettlement(
    id: string,
    input: SettlementInput,
  ): Promise<{ invoice: Invoice; campaign: Campaign }> {
    const { invoice, campaign } = await apiRequest<{
      invoice: ApiInvoice;
      campaign: ApiCampaign;
    }>(`/api/business/invoices/${id}/settlement`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return {
      invoice: hydrateInvoice(invoice),
      campaign: hydrateCampaign(campaign),
    };
  },
};

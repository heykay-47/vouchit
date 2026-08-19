import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { businessService } from '@/services/business.service';
import type {
  CampaignDraftInput,
  CampaignInventoryCandidate,
  SettlementInput,
} from '@/lib/types';

export const businessQueryKeys = {
  all: ['business'] as const,
  campaigns: () => ['business', 'campaigns'] as const,
  campaign: (id: string) => ['business', 'campaigns', id] as const,
  invoices: () => ['business', 'invoices'] as const,
};

const invalidateCampaign = async (queryClient: ReturnType<typeof useQueryClient>, id: string) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: businessQueryKeys.campaigns() }),
    queryClient.invalidateQueries({ queryKey: businessQueryKeys.campaign(id) }),
  ]);
};

export const useBusinessCampaignsQuery = () => useQuery({
  queryKey: businessQueryKeys.campaigns(),
  queryFn: businessService.listCampaigns,
});

export const useBusinessCampaignQuery = (id: string) => useQuery({
  queryKey: businessQueryKeys.campaign(id),
  queryFn: () => businessService.getCampaign(id),
  enabled: Boolean(id),
});

export const useCreateCampaignMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CampaignDraftInput) => businessService.createCampaign(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: businessQueryKeys.campaigns() }),
  });
};

export const useUpdateCampaignMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CampaignDraftInput }) => (
      businessService.updateCampaign(id, input)
    ),
    onSuccess: (_workspace, { id }) => invalidateCampaign(queryClient, id),
  });
};

export const usePreviewInventoryMutation = () => useMutation({
  mutationFn: ({ id, input }: {
    id: string;
    input: { headers: string[]; rows: CampaignInventoryCandidate[] };
  }) => businessService.previewInventory(id, input),
});

export const useReplaceInventoryMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rows }: { id: string; rows: CampaignInventoryCandidate[] }) => (
      businessService.replaceInventory(id, rows)
    ),
    onSuccess: (_workspace, { id }) => invalidateCampaign(queryClient, id),
  });
};

export const useIssueInvoiceMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => businessService.issueInvoice(id),
    onSuccess: (_invoice, id) => Promise.all([
      invalidateCampaign(queryClient, id),
      queryClient.invalidateQueries({ queryKey: businessQueryKeys.invoices() }),
    ]),
  });
};

export const useBusinessInvoicesQuery = () => useQuery({
  queryKey: businessQueryKeys.invoices(),
  queryFn: businessService.listInvoices,
});

export const useRecordSettlementMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SettlementInput }) => (
      businessService.recordSettlement(id, input)
    ),
    onSuccess: async (result) => {
      await Promise.all([
        invalidateCampaign(queryClient, result.campaign.id),
        queryClient.invalidateQueries({ queryKey: businessQueryKeys.invoices() }),
      ]);
    },
  });
};

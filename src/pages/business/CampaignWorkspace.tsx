import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import CampaignDetailsForm from '@/components/business/CampaignDetailsForm';
import CampaignInventoryImport from '@/components/business/CampaignInventoryImport';
import CampaignInvoice from '@/components/business/CampaignInvoice';
import CampaignStages, { type CampaignStage } from '@/components/business/CampaignStages';
import SettlementForm from '@/components/business/SettlementForm';
import {
  useBusinessCampaignQuery,
  useCreateCampaignMutation,
  useIssueInvoiceMutation,
  useUpdateCampaignMutation,
} from '@/hooks/useBusinessQueries';
import type { CampaignDraftInput, CampaignStatus } from '@/lib/types';

const deriveCampaignStage = (status: CampaignStatus, inventoryCount: number): CampaignStage => (
  status === 'draft'
    ? (inventoryCount > 0 ? 'inventory' : 'details')
    : status === 'awaiting_payment'
      ? 'invoice'
      : 'active'
);

export default function CampaignWorkspace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const query = useBusinessCampaignQuery(id ?? '');
  const createMutation = useCreateCampaignMutation();
  const updateMutation = useUpdateCampaignMutation();
  const issueMutation = useIssueInvoiceMutation();
  const campaign = query.data?.campaign;
  const isNew = !id;
  const isLocked = Boolean(campaign?.lockedAt) || (campaign ? campaign.status !== 'draft' : false);
  const initialValues = useMemo(() => campaign ? {
    title: campaign.title,
    brandName: campaign.brandName,
    description: campaign.description,
    terms: campaign.terms,
    platform: campaign.platform,
    category: campaign.category,
    imageUrl: campaign.imageUrl,
    expiryDate: campaign.expiryDate.toISOString(),
  } : undefined, [campaign]);

  const saveDetails = async (input: CampaignDraftInput) => {
    if (id) {
      await updateMutation.mutateAsync({ id, input });
      return;
    }
    const created = await createMutation.mutateAsync(input);
    navigate(`/business/campaigns/${created.campaign.id}`);
  };

  const issueInvoice = async () => {
    if (campaign) await issueMutation.mutateAsync(campaign.id);
  };

  if (query.isLoading && !isNew) return <p className="py-4 text-sm text-muted-foreground">loading campaign...</p>;
  if (query.error && !isNew) return <p role="alert" className="py-4 break-words text-sm text-destructive">unable to load campaign</p>;
  if (!isNew && !campaign) return <p role="alert" className="py-4 text-sm text-destructive">campaign not found</p>;

  const stage = campaign ? deriveCampaignStage(campaign.status, query.data?.inventoryCount ?? 0) : 'details';

  return (
    <section className="space-y-6 py-4" aria-labelledby="campaign-workspace-title">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button asChild variant="link" className="h-auto px-0 lowercase"><Link to="/business">back to dashboard</Link></Button>
          <h1 id="campaign-workspace-title" className="text-2xl font-medium lowercase">{campaign?.title ?? 'new campaign'}</h1>
          {campaign ? <p className="text-sm text-muted-foreground">{campaign.organizationName}</p> : null}
        </div>
        {campaign ? <span className="self-start rounded-full border border-border px-2 py-1 text-xs lowercase">{campaign.effectiveStatus}</span> : null}
      </header>

      <CampaignStages stage={stage} />

      <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
        <h2 className="mb-4 text-lg font-medium lowercase">campaign details</h2>
        <CampaignDetailsForm
          key={campaign?.id ?? 'new-campaign'}
          initialValues={initialValues}
          disabled={isLocked}
          isSubmitting={createMutation.isPending || updateMutation.isPending}
          onSubmit={saveDetails}
        />
      </div>

      {campaign ? (
        <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
          <CampaignInventoryImport campaignId={campaign.id} disabled={isLocked} onConfirmed={() => void query.refetch()} />
        </div>
      ) : null}

      {campaign && query.data && campaign.status === 'draft' && query.data.inventoryCount > 0 && !query.data.invoice ? (
        <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
          <section aria-labelledby="invoice-quote-title" className="space-y-4">
            <div>
              <h2 id="invoice-quote-title" className="text-lg font-medium lowercase">invoice quote</h2>
              <p className="text-sm text-muted-foreground">issue an invoice using the current server inventory count.</p>
            </div>
            <Button type="button" onClick={() => void issueInvoice()} disabled={issueMutation.isPending} className="w-full lowercase sm:w-auto">
              {issueMutation.isPending ? 'issuing...' : 'issue invoice'}
            </Button>
          </section>
        </div>
      ) : null}

      {query.data?.invoice ? (
        <div className="rounded-lg border border-border bg-card p-5 sm:p-6">
          <CampaignInvoice invoice={query.data.invoice} />
          {query.data.invoice.status === 'issued' ? (
            <div className="mt-6 border-t border-border pt-6">
              <SettlementForm invoice={query.data.invoice} />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

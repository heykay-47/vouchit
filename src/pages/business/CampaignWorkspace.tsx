import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import CampaignDetailsForm from '@/components/business/CampaignDetailsForm';
import CampaignInventoryImport from '@/components/business/CampaignInventoryImport';
import CampaignStages, { type CampaignStage } from '@/components/business/CampaignStages';
import {
  useBusinessCampaignQuery,
  useCreateCampaignMutation,
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
    </section>
  );
}

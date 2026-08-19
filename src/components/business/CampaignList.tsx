import { Link } from 'react-router-dom';
import type { CampaignSummary } from '@/lib/types';

interface CampaignListProps {
  campaigns: CampaignSummary[];
}

export default function CampaignList({ campaigns }: CampaignListProps) {
  const recentCampaigns = [...campaigns]
    .sort((left, right) => right.campaign.createdAt.getTime() - left.campaign.createdAt.getTime())
    .slice(0, 5);

  return (
    <section aria-labelledby="recent-campaigns-title" className="space-y-3">
      <h2 id="recent-campaigns-title" className="text-lg font-medium lowercase">recent campaigns</h2>
      {recentCampaigns.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          no campaigns yet. create one to start importing voucher inventory.
        </p>
      ) : (
        <div className="space-y-3" aria-label="campaign list">
          {recentCampaigns.map(({ campaign, inventoryCount, analytics }) => (
            <Link
              key={campaign.id}
              to={`/business/campaigns/${campaign.id}`}
              className="block rounded-lg border border-border bg-card p-5 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h3 className="break-words font-medium">{campaign.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {inventoryCount} inventory vouchers
                    {analytics ? ` · ${analytics.claimedBeforeExpiry} claimed` : ' · outcomes not available'}
                  </p>
                </div>
                <span className="self-start rounded-full border border-border px-2 py-1 text-xs lowercase sm:self-auto">
                  {campaign.effectiveStatus}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

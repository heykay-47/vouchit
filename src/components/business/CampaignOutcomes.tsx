import type { CampaignAnalytics } from '@/lib/types';
import { formatPaiseAsInr } from '@/lib/money';

interface CampaignOutcomesProps {
  analytics: CampaignAnalytics;
}

const formatClaimRate = (claimRate: number) => `${Math.round(claimRate * 100)}%`;

export default function CampaignOutcomes({ analytics }: CampaignOutcomesProps) {
  return (
    <section aria-labelledby="campaign-outcomes-title" className="space-y-4">
      <div>
        <h2 id="campaign-outcomes-title" className="text-lg font-medium lowercase">campaign outcomes</h2>
        <p className="text-sm text-muted-foreground">
          Observed values only. Views are aggregate detail opens; payment was recorded externally.
        </p>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">total inventory</dt>
          <dd className="text-lg font-medium">{analytics.totalInventory}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">aggregate views</dt>
          <dd className="text-lg font-medium">{analytics.views}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">claimed before expiry</dt>
          <dd className="text-lg font-medium">{analytics.claimedBeforeExpiry}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">remaining</dt>
          <dd className="text-lg font-medium">{analytics.remaining}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">expired</dt>
          <dd className="font-medium">{analytics.expired}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">deactivated</dt>
          <dd className="font-medium">{analytics.deactivated}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">claim rate</dt>
          <dd className="font-medium">{formatClaimRate(analytics.claimRate)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">fee per claim</dt>
          <dd className="font-medium">
            {analytics.feePerClaimPaise === null || analytics.feePerClaimPaise === 0
              ? 'not available'
              : formatPaiseAsInr(analytics.feePerClaimPaise)}
          </dd>
        </div>
      </dl>

      <ol aria-label="campaign outcome funnel" className="grid gap-2 text-sm sm:grid-cols-3">
        <li className="rounded-md border border-border px-3 py-2">
          <span className="block text-muted-foreground">inventory</span>
          <span className="font-medium">{analytics.totalInventory}</span>
        </li>
        <li className="rounded-md border border-border px-3 py-2">
          <span className="block text-muted-foreground">claimed</span>
          <span className="font-medium">{analytics.claimedBeforeExpiry}</span>
        </li>
        <li className="rounded-md border border-border px-3 py-2">
          <span className="block text-muted-foreground">remaining</span>
          <span className="font-medium">{analytics.remaining}</span>
        </li>
      </ol>
    </section>
  );
}

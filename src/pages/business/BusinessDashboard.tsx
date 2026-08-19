import { useAuth } from '@/contexts/AuthContext';
import { useBusinessCampaignsQuery } from '@/hooks/useBusinessQueries';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function BusinessDashboard() {
  const { user } = useAuth();
  const { data: campaigns, isLoading, error } = useBusinessCampaignsQuery();

  return (
    <section className="py-4" aria-labelledby="business-dashboard-title">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 id="business-dashboard-title" className="mb-2 text-2xl font-medium lowercase">
            business dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            welcome back, {user?.username?.toLowerCase() || 'business'}
          </p>
        </div>
        <Button asChild className="w-full lowercase sm:w-auto">
          <Link to="/business/campaigns/new">new campaign</Link>
        </Button>
      </header>

      {error ? <p role="alert" className="mb-4 break-words text-sm text-destructive">unable to load campaigns</p> : null}
      {isLoading ? <p className="text-sm text-muted-foreground">loading campaigns...</p> : null}
      {!isLoading && !error && campaigns?.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">create a campaign to start importing voucher inventory.</p>
        </div>
      ) : null}
      {!isLoading && !error && campaigns && campaigns.length > 0 ? (
        <div className="space-y-3" aria-label="campaign list">
          {campaigns.map(({ campaign, inventoryCount }) => (
            <Link
              key={campaign.id}
              to={`/business/campaigns/${campaign.id}`}
              className="block rounded-lg border border-border bg-card p-5 transition-colors hover:bg-muted/40"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-medium">{campaign.title}</h2>
                  <p className="text-sm text-muted-foreground">{inventoryCount} inventory vouchers</p>
                </div>
                <span className="self-start rounded-full border border-border px-2 py-1 text-xs lowercase sm:self-auto">
                  {campaign.effectiveStatus}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}

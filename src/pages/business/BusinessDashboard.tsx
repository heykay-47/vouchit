import { useAuth } from '@/contexts/AuthContext';
import { useBusinessCampaignsQuery, useBusinessInvoicesQuery } from '@/hooks/useBusinessQueries';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import CampaignList from '@/components/business/CampaignList';
import { formatPaiseAsInr } from '@/lib/money';
import type { CampaignStatus } from '@/lib/types';

const statuses: CampaignStatus[] = ['draft', 'awaiting_payment', 'active', 'completed'];

export default function BusinessDashboard() {
  const { user } = useAuth();
  const campaignsQuery = useBusinessCampaignsQuery();
  const invoicesQuery = useBusinessInvoicesQuery();
  const campaigns = campaignsQuery.data ?? [];
  const invoices = invoicesQuery.data ?? [];
  const isLoading = campaignsQuery.isLoading || invoicesQuery.isLoading;
  const error = campaignsQuery.error || invoicesQuery.error;
  const statusCounts = statuses.map((status) => ({
    status,
    count: campaigns.filter(({ campaign }) => campaign.effectiveStatus === status).length,
  }));
  const aggregateViews = campaigns.reduce((total, { analytics }) => total + (analytics?.views ?? 0), 0);
  const aggregateClaims = campaigns.reduce(
    (total, { analytics }) => total + (analytics?.claimedBeforeExpiry ?? 0),
    0,
  );
  const outstandingPaise = invoices.reduce(
    (total, invoice) => total + (invoice.status === 'paid' ? 0 : invoice.totalPaise),
    0,
  );
  const recentInvoices = [...invoices]
    .sort((left, right) => right.issuedAt.getTime() - left.issuedAt.getTime())
    .slice(0, 5);

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

      {error ? <p role="alert" className="mb-4 break-words text-sm text-destructive">unable to load dashboard data</p> : null}
      {isLoading ? <p className="text-sm text-muted-foreground">loading campaigns...</p> : null}
      {!isLoading && !error ? (
        <div className="space-y-8">
          <section aria-labelledby="campaign-status-title" className="space-y-3">
            <h2 id="campaign-status-title" className="text-lg font-medium lowercase">campaign status</h2>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              {statusCounts.map(({ status, count }) => (
                <div key={status} className="rounded-lg border border-border bg-card p-4">
                  <dt className="text-muted-foreground">{status}</dt>
                  <dd className="text-lg font-medium">{count}</dd>
                </div>
              ))}
            </dl>
          </section>

          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-4">
              <dt className="text-muted-foreground">aggregate views</dt>
              <dd className="text-lg font-medium">{aggregateViews}</dd>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <dt className="text-muted-foreground">aggregate claims</dt>
              <dd className="text-lg font-medium">{aggregateClaims}</dd>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <dt className="text-muted-foreground">outstanding totals</dt>
              <dd className="text-lg font-medium">{formatPaiseAsInr(outstandingPaise)}</dd>
            </div>
          </dl>

          <CampaignList campaigns={campaigns} />

          <section aria-labelledby="recent-invoices-title" className="space-y-3">
            <h2 id="recent-invoices-title" className="text-lg font-medium lowercase">recent invoices</h2>
            {recentInvoices.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
                no invoices yet.
              </p>
            ) : (
              <div className="space-y-3" aria-label="recent invoice list">
                {recentInvoices.map((invoice) => (
                  <Link
                    key={invoice.id}
                    to={`/business/campaigns/${invoice.campaignId}`}
                    className="flex min-h-11 flex-col gap-1 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="break-all text-sm">invoice {invoice.id}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatPaiseAsInr(invoice.totalPaise)} · {invoice.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </section>
  );
}

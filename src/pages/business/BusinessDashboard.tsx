import { useAuth } from '@/contexts/AuthContext';

export default function BusinessDashboard() {
  const { user } = useAuth();

  return (
    <section className="py-4" aria-labelledby="business-dashboard-title">
      <header className="mb-8">
        <h1 id="business-dashboard-title" className="mb-2 text-2xl font-medium lowercase">
          business dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          welcome back, {user?.username?.toLowerCase() || 'business'}
        </p>
      </header>

      <div className="rounded-lg border border-dashed border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          manage campaigns and invoices from the business navigation as those workspaces become available.
        </p>
      </div>
    </section>
  );
}

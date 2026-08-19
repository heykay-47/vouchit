import InvoiceList from '@/components/business/InvoiceList';
import SettlementForm from '@/components/business/SettlementForm';
import { useBusinessInvoicesQuery } from '@/hooks/useBusinessQueries';

export default function BusinessInvoices() {
  const query = useBusinessInvoicesQuery();
  const invoices = query.data ?? [];

  return (
    <section className="space-y-6 py-4" aria-labelledby="business-invoices-title">
      <header>
        <h1 id="business-invoices-title" className="text-2xl font-medium lowercase">business invoices</h1>
        <p className="mt-2 text-sm text-muted-foreground">review invoice snapshots and record external payments.</p>
      </header>

      {query.error ? <p role="alert" className="break-words text-sm text-destructive">unable to load invoices</p> : null}
      {query.isLoading ? <p className="text-sm text-muted-foreground">loading invoices...</p> : null}
      {!query.isLoading && !query.error ? <InvoiceList invoices={invoices} /> : null}
      {!query.isLoading && !query.error && invoices.length > 0 ? (
        <div className="space-y-4" aria-label="invoice payment records">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="rounded-lg border border-border bg-card p-5 sm:p-6">
              <SettlementForm invoice={invoice} />
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

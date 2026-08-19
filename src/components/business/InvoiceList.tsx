import { Link } from 'react-router-dom';
import { formatPaiseAsInr } from '@/lib/money';
import type { Invoice } from '@/lib/types';

interface InvoiceListProps {
  invoices: Invoice[];
}

const formatDate = (date: Date) => date.toLocaleDateString('en-IN', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

export default function InvoiceList({ invoices }: InvoiceListProps) {
  if (invoices.length === 0) {
    return <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">no invoices yet.</p>;
  }

  return (
    <div aria-label="invoice list" className="space-y-3">
      {invoices.map((invoice) => (
        <article key={invoice.id} className="rounded-lg border border-border bg-card p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Link
                to={`/business/campaigns/${invoice.campaignId}`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                campaign {invoice.campaignId}
              </Link>
              <p className="break-all text-sm text-muted-foreground">invoice {invoice.id}</p>
            </div>
            <span className="self-start rounded-full border border-border px-2 py-1 text-xs lowercase">{invoice.status}</span>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">total</dt>
              <dd className="font-medium">{formatPaiseAsInr(invoice.totalPaise)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">quantity</dt>
              <dd className="font-medium">{invoice.quantity}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">issued</dt>
              <dd className="font-medium">{formatDate(invoice.issuedAt)}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}

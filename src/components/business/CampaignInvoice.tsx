import type { Invoice } from '@/lib/types';
import { formatPaiseAsInr } from '@/lib/money';

interface CampaignInvoiceProps {
  invoice: Invoice;
}

const formatDate = (date: Date) => date.toLocaleDateString('en-IN', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

export default function CampaignInvoice({ invoice }: CampaignInvoiceProps) {
  return (
    <section aria-labelledby="campaign-invoice-title" className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="campaign-invoice-title" className="text-lg font-medium lowercase">campaign invoice</h2>
          <p className="text-sm text-muted-foreground">immutable pricing snapshot from the server.</p>
        </div>
        <span className="self-start rounded-full border border-border px-2 py-1 text-xs lowercase">{invoice.status}</span>
      </div>

      <p className="rounded-md bg-muted/40 p-3 text-sm" aria-label="invoice formula">
        {formatPaiseAsInr(invoice.baseFeePaise)} + ({formatPaiseAsInr(invoice.perVoucherFeePaise)} × {invoice.quantity}) = {formatPaiseAsInr(invoice.totalPaise)}
      </p>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">invoice id</dt>
          <dd className="break-all font-medium">{invoice.id}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">price version</dt>
          <dd className="font-medium">{invoice.priceVersion}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">currency</dt>
          <dd className="font-medium">{invoice.currency}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">base fee</dt>
          <dd className="font-medium">{formatPaiseAsInr(invoice.baseFeePaise)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">per voucher fee</dt>
          <dd className="font-medium">{formatPaiseAsInr(invoice.perVoucherFeePaise)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">quantity</dt>
          <dd className="font-medium">{invoice.quantity}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">total</dt>
          <dd className="font-medium">{formatPaiseAsInr(invoice.totalPaise)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">issued</dt>
          <dd className="font-medium">{formatDate(invoice.issuedAt)}</dd>
        </div>
      </dl>
    </section>
  );
}

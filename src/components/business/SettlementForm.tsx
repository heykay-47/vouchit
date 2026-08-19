import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRecordSettlementMutation } from '@/hooks/useBusinessQueries';
import { formatInvoiceDateTime, toSettlementDateTime } from '@/lib/invoice-dates';
import { formatPaiseAsInr, formatPaiseAsRupeesInput, parseRupeesToPaise } from '@/lib/money';
import type { Invoice } from '@/lib/types';

interface SettlementFormProps {
  invoice: Invoice;
}

export default function SettlementForm({ invoice }: SettlementFormProps) {
  const mutation = useRecordSettlementMutation();
  const [amount, setAmount] = useState(formatPaiseAsRupeesInput(invoice.totalPaise));
  const [reference, setReference] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [settledInvoice, setSettledInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const currentInvoice = settledInvoice ?? invoice;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      if (!paymentDate) throw new Error('payment date is required');
      const result = await mutation.mutateAsync({
        id: invoice.id,
        input: {
          amountPaise: parseRupeesToPaise(amount),
          externalPaymentReference: reference.trim(),
          externalPaymentDate: toSettlementDateTime(paymentDate, new Date(), invoice.issuedAt),
        },
      });
      setSettledInvoice(result.invoice);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'unable to record external payment');
    }
  };

  return (
    <section aria-labelledby={`settlement-title-${invoice.id}`} className="space-y-4">
      <div>
        <h2 id={`settlement-title-${invoice.id}`} className="text-lg font-medium lowercase">external payment</h2>
        <p className="text-sm text-muted-foreground">record the payment made outside VouchIt against this invoice.</p>
      </div>
      {currentInvoice.status === 'paid' ? (
        <dl className="grid gap-3 rounded-md border border-border p-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">payment reference</dt>
            <dd className="break-all font-medium">{currentInvoice.externalPaymentReference ?? 'not available'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">payment date</dt>
            <dd className="font-medium">{currentInvoice.externalPaymentDate ? formatInvoiceDateTime(currentInvoice.externalPaymentDate) : 'not available'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">amount</dt>
            <dd className="font-medium">{formatPaiseAsInr(currentInvoice.totalPaise)}</dd>
          </div>
        </dl>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? <p role="alert" className="break-words rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`payment-amount-${invoice.id}`}>payment amount (INR)</Label>
              <Input
                id={`payment-amount-${invoice.id}`}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="decimal"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`payment-reference-${invoice.id}`}>payment reference</Label>
              <Input
                id={`payment-reference-${invoice.id}`}
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`payment-date-${invoice.id}`}>payment date</Label>
              <Input
                id={`payment-date-${invoice.id}`}
                type="date"
                value={paymentDate}
                onChange={(event) => setPaymentDate(event.target.value)}
                required
              />
            </div>
          </div>
          <Button type="submit" disabled={mutation.isPending} className="w-full lowercase sm:w-auto">
            {mutation.isPending ? 'recording...' : 'record external payment'}
          </Button>
        </form>
      )}
    </section>
  );
}

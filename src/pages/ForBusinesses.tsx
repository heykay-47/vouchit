import { BriefcaseBusiness, FileSpreadsheet, ReceiptText, WalletCards } from 'lucide-react';
import { useAuthDialog } from '@/contexts/AuthDialogContext';
import { Button } from '@/components/ui/button';

const workflow = [
  {
    icon: BriefcaseBusiness,
    title: 'create a campaign',
    description: 'Set the campaign details and expiry date for the vouchers you want to publish.',
  },
  {
    icon: FileSpreadsheet,
    title: 'validate your CSV inventory',
    description: 'Upload a CSV and review accepted rows and rejections before confirming inventory.',
  },
  {
    icon: ReceiptText,
    title: 'receive an invoice',
    description: 'The prototype prices each campaign at ₹99 + ₹2 per voucher in the confirmed inventory.',
  },
  {
    icon: WalletCards,
    title: 'record external/offline settlement',
    description: 'Record the settlement evidence against the invoice; the prototype does not process it.',
  },
];

export default function ForBusinesses() {
  const { openSignup } = useAuthDialog();

  return (
    <main className="max-w-3xl py-4" aria-labelledby="for-businesses-title">
      <header className="mb-8 max-w-2xl">
        <p className="mb-2 text-sm lowercase text-muted-foreground">business campaigns</p>
        <h1 id="for-businesses-title" className="mb-3 text-2xl font-medium lowercase">
          for businesses
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          Publish a campaign inventory for people browsing vouchit. The prototype keeps the workflow
          explicit: validate the CSV, record external settlement, then make the campaign available.
        </p>
      </header>

      <div className="space-y-8">
        <section aria-labelledby="business-workflow-title">
          <h2 id="business-workflow-title" className="mb-4 text-lg font-medium lowercase">
            from inventory to publish
          </h2>
          <ol className="grid gap-3 sm:grid-cols-2">
            {workflow.map(({ icon: Icon, title, description }, index) => (
              <li key={title} className="rounded-lg border border-border bg-card p-5">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <span className="text-sm text-muted-foreground">0{index + 1}</span>
                </div>
                <h3 className="mb-2 font-medium lowercase">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-lg border border-border bg-card p-5" aria-labelledby="business-publish-title">
          <h2 id="business-publish-title" className="mb-2 text-lg font-medium lowercase">
            settlement-gated publish
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Publish only after settlement is recorded. A campaign stays unpublished until its external
            or offline settlement is recorded. Once it is active, you can observe aggregate views and
            claims before expiry in the business workspace.
          </p>
        </section>

        <section className="flex flex-col gap-4 rounded-lg border border-border p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-medium lowercase">ready to set up a campaign?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Create a business account to access the campaign workspace.</p>
          </div>
          <Button
            type="button"
            className="w-full lowercase sm:w-auto"
            onClick={(event) => openSignup(event.currentTarget, undefined, 'business')}
          >
            create business account
          </Button>
        </section>
      </div>
    </main>
  );
}

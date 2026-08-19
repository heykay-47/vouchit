import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { parseCampaignCsv } from '@/lib/campaign-csv';
import type { CampaignInventoryPreview } from '@/lib/types';
import { usePreviewInventoryMutation, useReplaceInventoryMutation } from '@/hooks/useBusinessQueries';

interface CampaignInventoryImportProps {
  campaignId: string;
  disabled?: boolean;
  onConfirmed?: () => void;
}

export default function CampaignInventoryImport({ campaignId, disabled = false, onConfirmed }: CampaignInventoryImportProps) {
  const [preview, setPreview] = useState<CampaignInventoryPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previewMutation = usePreviewInventoryMutation();
  const replaceMutation = useReplaceInventoryMutation();
  const acceptedCount = preview?.accepted.length ?? 0;
  const isPending = previewMutation.isPending || replaceMutation.isPending;

  const handleFileChange = async (file: File | undefined) => {
    if (!file || disabled) return;
    setError(null);
    setPreview(null);
    try {
      const parsed = await parseCampaignCsv(file);
      setPreview(await previewMutation.mutateAsync({ id: campaignId, input: parsed }));
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : 'unable to preview inventory');
    }
  };

  const confirmAccepted = async () => {
    if (!preview || acceptedCount === 0 || disabled) return;
    setError(null);
    try {
      await replaceMutation.mutateAsync({ id: campaignId, rows: preview.accepted });
      onConfirmed?.();
    } catch (replaceError) {
      setError(replaceError instanceof Error ? replaceError.message : 'unable to confirm inventory');
    }
  };

  return (
    <section aria-labelledby="campaign-inventory-title" className="space-y-4">
      <div>
        <h2 id="campaign-inventory-title" className="text-lg font-medium lowercase">voucher inventory</h2>
        <p className="text-sm text-muted-foreground">upload a CSV with exactly <code>code</code> or <code>code,value</code> headers.</p>
      </div>
      {error ? <p role="alert" className="break-words rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
      <Input id="campaign-inventory-file" aria-label="inventory CSV" type="file" accept=".csv,text/csv" onChange={(event) => handleFileChange(event.target.files?.[0])} disabled={disabled || isPending} />
      <p role="status" aria-live="polite" className="break-words text-sm text-muted-foreground">
        {preview ? `${preview.accepted.length} accepted, ${preview.rejected.length} rejected, ${preview.totalRows} total rows` : 'choose a CSV to preview inventory; nothing is saved during preview.'}
      </p>
      {preview ? (
        <div className="space-y-4" aria-label="inventory preview">
          {preview.rejected.length > 0 ? (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[24rem] text-left text-sm">
                <caption className="sr-only">Rejected inventory source rows</caption>
                <thead><tr className="border-b border-border"><th scope="col" className="p-3">source row</th><th scope="col" className="p-3">reason</th></tr></thead>
                <tbody>
                  {preview.rejected.map((rejection) => (
                    <tr key={`${rejection.sourceRow}-${rejection.reason}`} className="border-b border-border last:border-0">
                      <td className="p-3">row {rejection.sourceRow}</td>
                      <td className="break-words p-3">{rejection.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <Button type="button" onClick={() => void confirmAccepted()} disabled={disabled || isPending || acceptedCount === 0} className="w-full lowercase sm:w-auto">
            confirm {acceptedCount} voucher{acceptedCount === 1 ? '' : 's'}
          </Button>
        </div>
      ) : (
        <Button type="button" disabled className="w-full lowercase sm:w-auto">confirm 0 vouchers</Button>
      )}
    </section>
  );
}

import { useEffect, useId, useRef, useState } from 'react';
import { Copy } from 'lucide-react';
import type { CampaignOffer } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthDialog } from '@/contexts/AuthDialogContext';
import { useClaimCampaignMutation } from '@/hooks/useOffersQuery';
import { ApiClientError } from '@/services/api-client';
import { offerService } from '@/services/offer.service';
import { logger } from '@/utils/logger';
import { toast } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export type OpenCampaignOffer = (
  offer: CampaignOffer,
  trigger: HTMLButtonElement,
) => void;

export function CampaignOfferCard({
  offer,
  onOpen,
}: {
  offer: CampaignOffer;
  onOpen: OpenCampaignOffer;
}) {
  return (
    <button
      type="button"
      className="min-h-[156px] w-full rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 active:bg-muted/60"
      onClick={(event) => onOpen(offer, event.currentTarget)}
    >
      <div className="mb-3 flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="block text-xs text-muted-foreground">business campaign</span>
          <p className="mt-1 flex flex-wrap gap-x-1 text-[11px] text-muted-foreground">
            <span className="min-w-0 break-words">{offer.organizationName}</span>
            <span className="min-w-0 break-words">{offer.brandName}</span>
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-foreground">
          {offer.remainingCount} available
        </span>
      </div>
      <h3 className="mb-2 line-clamp-1 break-words text-sm font-medium">{offer.title}</h3>
      <p className="mb-2 break-words text-xs text-muted-foreground">
        {offer.platform} / {offer.category}
      </p>
      <p className="mb-4 line-clamp-2 break-words text-xs text-muted-foreground">
        {offer.description}
      </p>
      <p className="text-xs text-muted-foreground">
        expires {offer.expiryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </p>
      <span className="sr-only">view details</span>
    </button>
  );
}

export function CampaignOfferDialog({
  offer,
  open,
  trigger,
  focusFallback,
  onOpenChange,
}: {
  offer: CampaignOffer;
  open: boolean;
  trigger: HTMLButtonElement | null;
  focusFallback?: HTMLElement | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { isAuthenticated, user } = useAuth();
  const { openLogin } = useAuthDialog();
  const claim = useClaimCampaignMutation();
  const resetClaim = claim.reset;
  const [claimConflict, setClaimConflict] = useState(false);
  const [pendingAuthHandoff, setPendingAuthHandoff] = useState(false);
  const claimContext = useRef<{ offerId: string; viewerKey: string } | null>(null);
  const copyCodeRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const descriptionId = useId();
  const termsId = useId();
  const viewerKey = user?.id ?? 'anonymous';
  const claimBelongsToViewer = claimContext.current?.offerId === offer.id
    && claimContext.current.viewerKey === viewerKey;
  const assignedCode = claimBelongsToViewer
    && user?.id === claim.data?.voucher.redeemedBy
    ? claim.data.voucher.code
    : undefined;
  const hasClaimConflict = claimBelongsToViewer && claimConflict;
  const isClaimPending = claimBelongsToViewer && claim.isPending;
  const hasClaimError = claimBelongsToViewer && claim.isError;

  useEffect(() => {
    claimContext.current = null;
    resetClaim();
    setClaimConflict(false);
  }, [offer.id, resetClaim, viewerKey]);

  useEffect(() => {
    if (assignedCode) copyCodeRef.current?.focus();
  }, [assignedCode]);

  useEffect(() => {
    const opened = open && !wasOpen.current;
    wasOpen.current = open;
    if (!opened) return;

    void offerService.recordCampaignView(offer.id).catch((error) => {
      logger.error('Error recording campaign offer view', error, { campaignId: offer.id });
    });
  }, [open, offer.id]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      claimContext.current = null;
      resetClaim();
      setClaimConflict(false);
    }
    onOpenChange(nextOpen);
  };

  const handleClaim = async () => {
    if (!isAuthenticated) {
      setPendingAuthHandoff(true);
      handleOpenChange(false);
      return;
    }
    if (user?.role !== 'customer') return;

    const currentClaimContext = { offerId: offer.id, viewerKey };
    claimContext.current = currentClaimContext;
    try {
      setClaimConflict(false);
      await claim.mutateAsync(offer.id);
    } catch (error) {
      if (claimContext.current !== currentClaimContext) return;
      if (error instanceof ApiClientError && error.status === 409) {
        setClaimConflict(true);
        return;
      }
      toast.error('failed to claim campaign voucher');
      logger.error('Error claiming campaign voucher', error, { campaignId: offer.id });
    }
  };

  const copyAssignedCode = async () => {
    if (!assignedCode) return;
    try {
      await navigator.clipboard.writeText(assignedCode);
      toast.success('code copied');
    } catch (error) {
      toast.error('failed to copy code');
      logger.error('Error copying campaign code', error, { campaignId: offer.id });
    }
  };

  const formattedExpiry = offer.expiryDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onCloseAutoFocus={(event) => {
          if (pendingAuthHandoff) {
            event.preventDefault();
            setPendingAuthHandoff(false);
            openLogin(trigger?.isConnected ? trigger : focusFallback);
            return;
          }
          if (trigger?.isConnected) {
            event.preventDefault();
            trigger.focus();
            return;
          }
          if (focusFallback?.isConnected) {
            event.preventDefault();
            focusFallback.focus();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="break-words pr-10 font-medium">{offer.title}</DialogTitle>
          <DialogDescription className="break-words">
            {offer.platform} / {offer.category} / business campaign
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <dl className="space-y-2 text-sm">
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-4">
              <dt className="text-muted-foreground lowercase">organization</dt>
              <dd className="min-w-0 break-words text-right">{offer.organizationName}</dd>
            </div>
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-4">
              <dt className="text-muted-foreground lowercase">brand</dt>
              <dd className="min-w-0 break-words text-right">{offer.brandName}</dd>
            </div>
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-4">
              <dt className="text-muted-foreground lowercase">category</dt>
              <dd className="min-w-0 break-words text-right">{offer.category}</dd>
            </div>
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-4">
              <dt className="text-muted-foreground lowercase">expires</dt>
              <dd className="min-w-0 break-words text-right">{formattedExpiry}</dd>
            </div>
            <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-4">
              <dt className="text-muted-foreground lowercase">inventory</dt>
              <dd className="min-w-0 break-words text-right">{offer.remainingCount} available</dd>
            </div>
          </dl>

          <section aria-labelledby={descriptionId} className="border-t border-border pt-3">
            <h3 id={descriptionId} className="mb-1 text-sm font-medium lowercase">description</h3>
            <p className="break-words text-sm text-muted-foreground">{offer.description}</p>
          </section>

          <section aria-labelledby={termsId} className="border-t border-border pt-3">
            <h3 id={termsId} className="mb-1 text-sm font-medium lowercase">terms</h3>
            <p className="break-words text-sm text-muted-foreground">{offer.terms}</p>
          </section>

          {assignedCode && (
            <div className="rounded-lg bg-muted p-3">
              <p className="mb-2 text-xs text-muted-foreground lowercase">assigned code</p>
              <p role="status" className="sr-only">
                campaign voucher claimed, assigned code {assignedCode}
              </p>
              <button
                ref={copyCodeRef}
                type="button"
                aria-label={`copy assigned code ${assignedCode}`}
                className="min-h-11 w-full break-all rounded bg-background px-3 py-2 text-left font-mono text-sm transition-colors hover:bg-background/80"
                onClick={copyAssignedCode}
              >
                {assignedCode}
                <Copy aria-hidden="true" className="ml-2 inline h-4 w-4" />
              </button>
            </div>
          )}

          {hasClaimConflict && (
            <p role="alert" className="text-center text-sm text-muted-foreground lowercase">
              this campaign is already claimed or no longer available
            </p>
          )}

          {hasClaimError && !hasClaimConflict && (
            <p role="alert" className="text-center text-sm text-muted-foreground lowercase">
              failed to claim campaign voucher, please try again
            </p>
          )}

          {!assignedCode && !hasClaimConflict && (
            <div className="pt-2">
              {!isAuthenticated && (
                <Button className="min-h-11 w-full text-black lowercase" onClick={handleClaim}>
                  sign in to claim
                </Button>
              )}

              {isAuthenticated && user?.role === 'customer' && (
                <Button
                  className="min-h-11 w-full text-black lowercase"
                  disabled={isClaimPending}
                  onClick={handleClaim}
                >
                  {isClaimPending ? 'claiming from campaign…' : 'claim from campaign'}
                </Button>
              )}

              {isAuthenticated && user?.role === 'business' && (
                <p className="text-center text-sm text-muted-foreground lowercase">
                  use a customer account to claim
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

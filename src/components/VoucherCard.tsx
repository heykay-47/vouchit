import { useRef, useState, memo } from 'react';
import { Voucher } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthDialog } from '@/contexts/AuthDialogContext';
import { useVouchers } from '@/contexts/VoucherContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, X, AlertTriangle, Copy, ImageOff } from 'lucide-react';
import { toast } from '@/utils/toast';
import { logger } from '@/utils/logger';
import { ApiClientError } from '@/services/api-client';

interface VoucherCardProps {
  voucher: Voucher;
  onRedeemSuccess?: () => void;
}

const VoucherCard = memo(function VoucherCard({ voucher, onRedeemSuccess }: VoucherCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [hasImageError, setHasImageError] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [hasAvailabilityConflict, setHasAvailabilityConflict] = useState(false);
  const [pendingAuthHandoff, setPendingAuthHandoff] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { isAuthenticated, user } = useAuth();
  const { openLogin } = useAuthDialog();
  const { redeemVoucher, reportVoucher, retryVouchers } = useVouchers();

  const hasExpired = voucher.expiryDate ? new Date(voucher.expiryDate) < new Date() : false;
  const canUseCustomerActions = !user || user.role === 'customer';
  const canViewCode = isAuthenticated && !!voucher.code && (
    voucher.sourceType !== 'campaign' || user?.id === voucher.redeemedBy
  );
  const isRedeemable = canUseCustomerActions && !hasAvailabilityConflict && !voucher.isRedeemed && voucher.isActive && !hasExpired && user?.id !== voucher.donatedBy;
  const isOwnRedeemedVoucher = user?.id === voucher.redeemedBy;
  
  const getDaysUntilExpiry = () => {
    if (!voucher.expiryDate) return null;
    const expiryDate = new Date(voucher.expiryDate);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
  
  const daysUntilExpiry = getDaysUntilExpiry();
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 3;
  const campaignAttribution = voucher.sourceType === 'campaign' ? voucher.campaign : undefined;
  
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };
  
  const handleRedeem = async () => {
    if (!isAuthenticated || user?.role === 'business') {
      toast.error('please log in to redeem vouchers');
      return;
    }
    
    setIsRedeeming(true);
    try {
      await redeemVoucher(voucher.id);
      toast.success('voucher redeemed!');
      if (onRedeemSuccess) onRedeemSuccess();
      setIsDetailsOpen(false);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 409) {
        setHasAvailabilityConflict(true);
        toast.error('this voucher is no longer available');
        return;
      }
      toast.error('failed to redeem voucher');
      logger.error('Error redeeming voucher', error, {
        component: 'VoucherCard',
        voucherId: voucher.id,
      });
    } finally {
      setIsRedeeming(false);
    }
  };
  
  const handleReport = async () => {
    if (!isAuthenticated || user?.role === 'business') {
      toast.error('please log in to report vouchers');
      return;
    }
    
    setIsReporting(true);
    try {
      await reportVoucher(voucher.id);
      toast.success('voucher reported');
      setIsDetailsOpen(false);
    } catch (error) {
      toast.error('failed to report voucher');
      logger.error('Error reporting voucher', error, {
        component: 'VoucherCard',
        voucherId: voucher.id,
      });
    } finally {
      setIsReporting(false);
    }
  };
  
  const copyCode = async () => {
    if (!voucher.code) {
      toast.error('code not available');
      return;
    }
    try {
      await navigator.clipboard.writeText(voucher.code);
      toast.success('code copied');
    } catch (error) {
      toast.error('failed to copy code');
      logger.error('Error copying voucher code', error, {
        component: 'VoucherCard',
        voucherId: voucher.id,
      });
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsDetailsOpen(open);
    if (open) {
      setIsImageLoaded(false);
      setHasImageError(false);
    } else if (hasAvailabilityConflict) {
      void retryVouchers();
    }
  };

  const handleSignIn = () => {
    setPendingAuthHandoff(true);
    setIsDetailsOpen(false);
  };
  
  const getStatus = () => {
    if (!voucher.isActive) return { label: 'reported', color: 'bg-destructive/15 text-foreground' };
    if (voucher.isRedeemed) return { label: 'redeemed', color: 'bg-muted text-foreground' };
    if (hasExpired) return { label: 'expired', color: 'bg-muted text-foreground' };
    if (isExpiringSoon) return { label: `${daysUntilExpiry}d left`, color: 'bg-accent/20 text-foreground' };
    return { label: 'available', color: 'bg-primary/15 text-foreground' };
  };
  
  const status = getStatus();

  const unavailableMessage = hasAvailabilityConflict
    ? 'this voucher is no longer available'
    : !voucher.isActive
    ? 'this voucher is unavailable'
    : hasExpired
      ? 'this voucher has expired'
      : voucher.isRedeemed
        ? 'this voucher has already been redeemed'
        : user?.id === voucher.donatedBy
          ? 'you donated this voucher'
          : null;

  return (
    <Dialog open={isDetailsOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          aria-label={`${voucher.title}, ${voucher.platform}, ${status.label}, view details`}
          className="min-h-[156px] w-full rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 active:bg-muted/60"
        >
          {/* Header */}
          <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="block break-words text-xs text-muted-foreground">{voucher.platform}</span>
              {campaignAttribution && (
                <p className="mt-1 flex flex-wrap gap-x-1 text-[11px] text-muted-foreground">
                  <span>business campaign</span>
                  <span>{campaignAttribution.organizationName}</span>
                  <span>{campaignAttribution.brandName}</span>
                </p>
              )}
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs lowercase ${status.color}`}>{status.label}</span>
          </div>

          {/* Title */}
          <h3 className="mb-2 line-clamp-1 break-words text-sm font-medium">
            {voucher.title}
          </h3>

          {/* Description */}
          <p className="mb-4 line-clamp-2 break-words text-xs text-muted-foreground">
            {voucher.description || 'no description'}
          </p>

          {/* Footer */}
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="min-w-0 break-words text-xs text-muted-foreground">
              {voucher.expiryDate ? `expires ${formatDate(voucher.expiryDate)}` : 'no expiry'}
            </span>
            {voucher.value && (
              <span className="min-w-0 break-words text-right text-xs font-medium">{voucher.value}</span>
            )}
          </div>
        </button>
      </DialogTrigger>

      {/* Details Dialog */}
      <DialogContent
        className="sm:max-w-md"
        onCloseAutoFocus={(event) => {
          if (!pendingAuthHandoff) return;
          event.preventDefault();
          setPendingAuthHandoff(false);
          openLogin(triggerRef.current);
        }}
      >
        <DialogHeader>
          <DialogTitle className="break-words pr-10 font-medium">
            {voucher.title}
          </DialogTitle>
          <DialogDescription className="break-words">
            {voucher.platform} • {status.label}
          </DialogDescription>
          {campaignAttribution && (
            <div className="flex flex-wrap gap-x-1 text-xs text-muted-foreground">
              <span>business campaign</span>
              <span>{campaignAttribution.organizationName}</span>
              <span>{campaignAttribution.brandName}</span>
            </div>
          )}
        </DialogHeader>
          
          <div className="space-y-4">
            {/* Image */}
            {isAuthenticated && voucher.imageUrl && !hasImageError && (
              <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                <img
                  src={voucher.imageUrl}
                  alt={`${voucher.title} voucher from ${voucher.platform}`}
                  width="640"
                  height="360"
                  className={`object-cover w-full h-full transition-opacity ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => setIsImageLoaded(true)}
                  onError={() => setHasImageError(true)}
                />
                {!isImageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">loading…</span>
                  </div>
                )}
              </div>
            )}

            {isAuthenticated && voucher.imageUrl && hasImageError && (
              <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-lg bg-muted text-muted-foreground">
                <ImageOff className="h-8 w-8" aria-hidden="true" />
                <span className="text-xs">voucher image unavailable</span>
              </div>
            )}
            
            {!isAuthenticated && (
              <div className="rounded-lg bg-muted p-6 text-center">
                <AlertTriangle aria-hidden="true" className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground lowercase">sign in to view details</p>
              </div>
            )}
            
            {/* Details */}
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4">
                <span className="text-muted-foreground lowercase">code</span>
                {canViewCode ? (
                  <button
                    type="button"
                    aria-label={`copy code ${voucher.code}`}
                    onClick={copyCode}
                    className="min-h-11 min-w-0 justify-self-end break-all rounded bg-muted px-2 py-1 text-right font-mono text-xs hover:bg-muted/80"
                  >
                    {voucher.code}
                    <Copy aria-hidden="true" className="ml-1 inline h-3 w-3 shrink-0" />
                  </button>
                ) : (
                  <span className="text-muted-foreground">••••••••</span>
                )}
              </div>
              
              {voucher.value && (
                <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-4">
                  <span className="text-muted-foreground lowercase">value</span>
                  <span className="min-w-0 break-words text-right">{voucher.value}</span>
                </div>
              )}
              
              <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-4">
                <span className="text-muted-foreground lowercase">expires</span>
                <span className={`min-w-0 break-words text-right ${isExpiringSoon ? 'rounded bg-accent/20 px-2 py-0.5 text-foreground' : ''}`}>
                  {voucher.expiryDate ? formatDate(voucher.expiryDate) : 'never'}
                </span>
              </div>
              
              {voucher.description && (
                <div className="pt-2 border-t border-border">
                  <p className="break-words text-muted-foreground">{voucher.description}</p>
                </div>
              )}
            </div>
            
            {/* Actions */}
            <div className="space-y-2 pt-2">
              {!isAuthenticated && isRedeemable && (
                <Button className="min-h-11 w-full text-black lowercase" onClick={handleSignIn}>
                  sign in to redeem
                </Button>
              )}
              
              {isAuthenticated && isRedeemable && (
                <Button 
                  className="min-h-11 w-full text-black lowercase"
                  onClick={handleRedeem}
                  disabled={isRedeeming}
                >
                  {isRedeeming ? 'redeeming…' : 'redeem voucher'}
                </Button>
              )}
              
              {isAuthenticated && user?.role !== 'business' && voucher.isRedeemed && isOwnRedeemedVoucher && (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="min-h-11 flex-1 lowercase"
                    onClick={() => {
                      toast.success('thanks for the feedback!');
                      setIsDetailsOpen(false);
                    }}
                  >
                    <Check aria-hidden="true" className="mr-1 h-4 w-4" />
                    worked
                  </Button>
                  <Button 
                    variant="outline"
                    className="min-h-11 flex-1 lowercase"
                    onClick={handleReport}
                    disabled={isReporting}
                  >
                    <X aria-hidden="true" className="mr-1 h-4 w-4" />
                    {isReporting ? 'reporting…' : 'not working'}
                  </Button>
                </div>
              )}

              {!isRedeemable && unavailableMessage && (
                <p className="text-center text-sm text-muted-foreground lowercase">
                  {unavailableMessage}
                </p>
              )}
              
              {voucher.reportCount > 0 && (
                <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                  <AlertTriangle aria-hidden="true" className="h-3 w-3" />
                  reported {voucher.reportCount}x
                </p>
              )}
            </div>
          </div>
        </DialogContent>
    </Dialog>
  );
});

export default VoucherCard;

import { useState, memo } from 'react';
import { Voucher } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { useVouchers } from '@/contexts/VoucherContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, X, AlertTriangle, Copy, Clock } from 'lucide-react';
import { toast } from '@/utils/toast';
import { logger } from '@/utils/logger';

interface VoucherCardProps {
  voucher: Voucher;
  onRedeemSuccess?: () => void;
}

const VoucherCard = memo(function VoucherCard({ voucher, onRedeemSuccess }: VoucherCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const { redeemVoucher, reportVoucher } = useVouchers();
  
  const hasExpired = voucher.expiryDate ? new Date(voucher.expiryDate) < new Date() : false;
  const isRedeemable = !voucher.isRedeemed && voucher.isActive && !hasExpired;
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
  
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };
  
  const handleRedeem = async () => {
    if (!isAuthenticated) {
      toast.error('please log in to redeem vouchers');
      return;
    }
    
    setIsRedeeming(true);
    try {
      await redeemVoucher(voucher.id);
      toast.success('voucher redeemed!');
      if (onRedeemSuccess) onRedeemSuccess();
    } catch (error) {
      toast.error('failed to redeem voucher');
      logger.error('Error redeeming voucher', error, {
        component: 'VoucherCard',
        voucherId: voucher.id,
      });
    } finally {
      setIsRedeeming(false);
      setIsDetailsOpen(false);
    }
  };
  
  const handleReport = async () => {
    if (!isAuthenticated) {
      toast.error('please log in to report vouchers');
      return;
    }
    
    setIsReporting(true);
    try {
      await reportVoucher(voucher.id);
      toast.success('voucher reported');
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
  
  const copyCode = () => {
    if (!voucher.code) {
      toast.error('code not available');
      return;
    }
    navigator.clipboard.writeText(voucher.code);
    toast.success('code copied');
  };
  
  const getStatus = () => {
    if (!voucher.isActive) return { label: 'reported', color: 'text-destructive' };
    if (voucher.isRedeemed) return { label: 'redeemed', color: 'text-muted-foreground' };
    if (hasExpired) return { label: 'expired', color: 'text-muted-foreground' };
    if (isExpiringSoon) return { label: `${daysUntilExpiry}d left`, color: 'text-accent' };
    return { label: 'available', color: 'text-primary' };
  };
  
  const status = getStatus();

  return (
    <>
      {/* Minimal Card */}
      <div 
        className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer"
        onClick={() => setIsDetailsOpen(true)}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground lowercase">{voucher.platform.toLowerCase()}</span>
          <span className={`text-xs lowercase ${status.color}`}>{status.label}</span>
        </div>
        
        {/* Title */}
        <h3 className="font-medium text-sm mb-2 line-clamp-1 lowercase">
          {voucher.title.toLowerCase()}
        </h3>
        
        {/* Description */}
        <p className="text-xs text-muted-foreground line-clamp-2 mb-4">
          {voucher.description?.toLowerCase() || 'no description'}
        </p>
        
        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {voucher.expiryDate ? `expires ${formatDate(voucher.expiryDate)}` : 'no expiry'}
          </span>
          {voucher.value && (
            <span className="text-xs font-medium">{voucher.value}</span>
          )}
        </div>
      </div>
      
      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="lowercase font-medium">
              {voucher.title.toLowerCase()}
            </DialogTitle>
            <DialogDescription className="lowercase">
              {voucher.platform.toLowerCase()} • {status.label}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Image */}
            {isAuthenticated && voucher.imageUrl && (
              <div className="relative rounded-lg overflow-hidden bg-muted aspect-video">
                <img
                  src={voucher.imageUrl}
                  alt="voucher"
                  className={`object-cover w-full h-full transition-opacity ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => setIsImageLoaded(true)}
                />
                {!isImageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">loading...</span>
                  </div>
                )}
              </div>
            )}
            
            {!isAuthenticated && (
              <div className="rounded-lg bg-muted p-6 text-center">
                <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground lowercase">sign in to view details</p>
              </div>
            )}
            
            {/* Details */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground lowercase">code</span>
                {voucher.code ? (
                  <button
                    onClick={copyCode}
                    className="font-mono text-xs bg-muted px-2 py-1 rounded hover:bg-muted/80 flex items-center gap-1"
                  >
                    {voucher.code}
                    <Copy className="h-3 w-3" />
                  </button>
                ) : (
                  <span className="text-muted-foreground">••••••••</span>
                )}
              </div>
              
              {voucher.value && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground lowercase">value</span>
                  <span>{voucher.value}</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-muted-foreground lowercase">expires</span>
                <span className={isExpiringSoon ? 'text-accent' : ''}>
                  {voucher.expiryDate ? formatDate(voucher.expiryDate) : 'never'}
                </span>
              </div>
              
              {voucher.description && (
                <div className="pt-2 border-t border-border">
                  <p className="text-muted-foreground lowercase">{voucher.description.toLowerCase()}</p>
                </div>
              )}
            </div>
            
            {/* Actions */}
            <div className="space-y-2 pt-2">
              {!isAuthenticated && (
                <Button className="w-full lowercase" onClick={() => setIsDetailsOpen(false)}>
                  sign in to redeem
                </Button>
              )}
              
              {isAuthenticated && isRedeemable && (
                <Button 
                  className="w-full lowercase"
                  onClick={handleRedeem}
                  disabled={isRedeeming}
                >
                  {isRedeeming ? 'redeeming...' : 'redeem voucher'}
                </Button>
              )}
              
              {isAuthenticated && voucher.isRedeemed && isOwnRedeemedVoucher && (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 lowercase"
                    onClick={() => {
                      toast.success('thanks for the feedback!');
                      setIsDetailsOpen(false);
                    }}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    worked
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1 lowercase"
                    onClick={handleReport}
                    disabled={isReporting}
                  >
                    <X className="h-4 w-4 mr-1" />
                    {isReporting ? 'reporting...' : 'not working'}
                  </Button>
                </div>
              )}
              
              {voucher.reportCount > 0 && (
                <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  reported {voucher.reportCount}x
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});

export default VoucherCard;

export type CampaignAnalytics = {
  totalInventory: number;
  views: number;
  claimedBeforeExpiry: number;
  deactivated: number;
  expired: number;
  remaining: number;
  claimRate: number;
  feePerClaimPaise: number | null;
};

type CampaignVoucher = {
  isRedeemed?: boolean;
  redeemedAt?: Date | null;
  expiryDate?: Date | null;
  reportCount?: number;
  viewCount?: number;
};

type PaidInvoice = {
  status?: 'issued' | 'paid';
  totalPaise: number;
};

export const calculateCampaignAnalytics = (
  vouchers: CampaignVoucher[],
  invoice: PaidInvoice,
  now = new Date(),
): CampaignAnalytics => {
  let claimedBeforeExpiry = 0;
  let deactivated = 0;
  let expired = 0;
  let remaining = 0;
  let views = 0;

  vouchers.forEach((voucher) => {
    views += voucher.viewCount ?? 0;
    const redeemedBeforeExpiry = voucher.isRedeemed === true
      && voucher.redeemedAt instanceof Date
      && voucher.expiryDate instanceof Date
      && voucher.redeemedAt.getTime() <= voucher.expiryDate.getTime();

    if (redeemedBeforeExpiry) {
      claimedBeforeExpiry += 1;
    } else if ((voucher.reportCount ?? 0) >= 5) {
      deactivated += 1;
    } else if (
      voucher.isRedeemed !== true
      && voucher.expiryDate instanceof Date
      && voucher.expiryDate.getTime() <= now.getTime()
    ) {
      expired += 1;
    } else {
      remaining += 1;
    }
  });

  const totalInventory = vouchers.length;
  const claimRate = totalInventory === 0 ? 0 : claimedBeforeExpiry / totalInventory;

  return {
    totalInventory,
    views,
    claimedBeforeExpiry,
    deactivated,
    expired,
    remaining,
    claimRate,
    feePerClaimPaise: claimedBeforeExpiry === 0
      ? null
      : Math.round(invoice.totalPaise / claimedBeforeExpiry),
  };
};

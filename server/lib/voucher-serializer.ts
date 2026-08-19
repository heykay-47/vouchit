const toId = (value: unknown) => {
  if (value == null) return undefined;
  return value.toString();
};

type CampaignAttribution = {
  _id?: unknown;
  businessId?: unknown;
  brandName?: string;
  title?: string;
  description?: string;
  platform?: string;
  category?: string;
  imageUrl?: string;
  expiryDate?: Date | null;
};

type VoucherAttribution = {
  campaign?: CampaignAttribution;
  profile?: { organizationName?: string };
};

type VoucherInput = {
  _id: { toString: () => string };
  sourceType?: string;
  campaignId?: unknown;
  platform?: string;
  title?: string;
  description?: string;
  code?: string;
  imageUrl?: string;
  expiryDate?: Date | null;
  value?: string | null;
  donatedBy?: unknown;
  donatedAt?: Date;
  isRedeemed?: boolean;
  redeemedBy?: unknown;
  redeemedAt?: Date | null;
  reportCount?: number;
  isActive?: boolean;
  category?: string | null;
};

export const voucherAvailabilityFilter = (now = new Date()) => ({
  isActive: true,
  isRedeemed: false,
  $or: [
    { expiryDate: null },
    { expiryDate: { $exists: false } },
    { expiryDate: { $gt: now } },
  ],
});

export const publicVoucherFilter = (campaignIds: string[], now = new Date()) => ({
  ...voucherAvailabilityFilter(now),
  $and: [
    {
      $or: [
        { sourceType: 'community' },
        { sourceType: { $exists: false } },
        { sourceType: 'campaign', campaignId: { $in: campaignIds } },
      ],
    },
  ],
});

export const toVoucherResponse = (
  voucher: VoucherInput,
  viewerId?: string,
  attribution: VoucherAttribution = {},
) => {
  const sourceType = voucher.sourceType === 'campaign' ? 'campaign' : 'community';
  const donatedBy = toId(voucher.donatedBy);
  const redeemedBy = toId(voucher.redeemedBy);
  const canViewCode = !!viewerId && (
    redeemedBy === viewerId
    || (sourceType !== 'campaign' && donatedBy === viewerId)
  );
  const campaignId = toId(voucher.campaignId ?? attribution.campaign?._id);

  return {
    id: voucher._id.toString(),
    sourceType,
    platform: voucher.platform ?? attribution.campaign?.platform,
    title: voucher.title ?? attribution.campaign?.title,
    description: voucher.description ?? attribution.campaign?.description,
    ...(canViewCode ? { code: voucher.code } : {}),
    imageUrl: voucher.imageUrl ?? attribution.campaign?.imageUrl,
    expiryDate: voucher.expiryDate ?? attribution.campaign?.expiryDate ?? undefined,
    value: voucher.value ?? undefined,
    donatedBy,
    donatedAt: voucher.donatedAt,
    isRedeemed: voucher.isRedeemed,
    redeemedBy,
    redeemedAt: voucher.redeemedAt ?? undefined,
    reportCount: voucher.reportCount ?? 0,
    isActive: voucher.isActive,
    category: voucher.category ?? attribution.campaign?.category,
    ...(sourceType === 'campaign' ? {
      campaign: {
        campaignId,
        brandName: attribution.campaign?.brandName,
        organizationName: attribution.profile?.organizationName,
      },
    } : {}),
  };
};

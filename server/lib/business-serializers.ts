const toId = (value: unknown) => {
  if (value == null) return undefined;
  return value.toString();
};

type BusinessVoucherInput = {
  _id?: unknown;
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
  viewCount?: number;
};

type CampaignInput = {
  _id?: unknown;
  businessId?: unknown;
  businessProfileId?: unknown;
  title?: string;
  brandName?: string;
  description?: string;
  terms?: string;
  platform?: string;
  category?: string;
  imageUrl?: string;
  expiryDate: Date;
  status: string;
  lockedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export const toBusinessVoucherResponse = (voucher: BusinessVoucherInput) => ({
  id: toId(voucher._id),
  sourceType: voucher.sourceType ?? 'community',
  campaignId: toId(voucher.campaignId),
  platform: voucher.platform ?? undefined,
  title: voucher.title ?? undefined,
  description: voucher.description ?? undefined,
  code: voucher.code,
  imageUrl: voucher.imageUrl ?? undefined,
  expiryDate: voucher.expiryDate ?? undefined,
  value: voucher.value ?? undefined,
  donatedBy: toId(voucher.donatedBy),
  donatedAt: voucher.donatedAt,
  isRedeemed: voucher.isRedeemed,
  redeemedBy: toId(voucher.redeemedBy),
  redeemedAt: voucher.redeemedAt ?? undefined,
  reportCount: voucher.reportCount ?? 0,
  isActive: voucher.isActive,
  category: voucher.category ?? undefined,
  viewCount: voucher.viewCount ?? 0,
});

export const toCampaignResponse = (
  campaign: CampaignInput,
  organizationName: string,
  now = new Date(),
) => {
  const isExpired = campaign.status === 'active'
    && new Date(campaign.expiryDate).getTime() <= now.getTime();
  const effectiveStatus = isExpired ? 'completed' : campaign.status;
  const completionReason = effectiveStatus === 'completed' && campaign.status === 'active'
    ? 'expired'
    : undefined;

  return {
    id: toId(campaign._id),
    businessId: toId(campaign.businessId),
    businessProfileId: toId(campaign.businessProfileId),
    organizationName,
    title: campaign.title,
    brandName: campaign.brandName,
    description: campaign.description,
    terms: campaign.terms,
    platform: campaign.platform,
    category: campaign.category,
    imageUrl: campaign.imageUrl,
    expiryDate: campaign.expiryDate,
    status: campaign.status,
    effectiveStatus,
    completionReason,
    lockedAt: campaign.lockedAt ?? undefined,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  };
};

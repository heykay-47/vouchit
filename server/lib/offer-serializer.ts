export type OfferAggregateRow = {
  _id: { toString(): string };
  kind: 'community' | 'campaign';
  title: string;
  description: string;
  platform: string;
  imageUrl: string;
  expiryDate: Date | null;
  category?: string | null;
  value?: string | null;
  donatedBy?: { toString(): string };
  donatedAt?: Date;
  reportCount?: number;
  terms?: string;
  brandName?: string;
  organizationName?: string;
  remainingCount?: number;
  missingExpiry: 0 | 1;
  [key: string]: unknown;
};

export const toPublicOffer = (row: OfferAggregateRow, viewerId?: string) => {
  if (row.kind === 'campaign') {
    return {
      kind: 'campaign' as const,
      id: row._id.toString(),
      title: row.title,
      description: row.description,
      terms: row.terms,
      platform: row.platform,
      category: row.category,
      imageUrl: row.imageUrl,
      expiryDate: row.expiryDate,
      value: row.value ?? undefined,
      brandName: row.brandName,
      organizationName: row.organizationName,
      remainingCount: row.remainingCount,
    };
  }

  return {
    kind: 'community' as const,
    id: row._id.toString(),
    sourceType: 'community' as const,
    platform: row.platform,
    title: row.title,
    description: row.description,
    imageUrl: row.imageUrl,
    expiryDate: row.expiryDate,
    value: row.value ?? undefined,
    donatedBy: row.donatedBy?.toString() === viewerId ? viewerId : 'anonymous',
    donatedAt: row.donatedAt,
    isRedeemed: false,
    reportCount: row.reportCount ?? 0,
    isActive: true,
    category: row.category ?? null,
  };
};

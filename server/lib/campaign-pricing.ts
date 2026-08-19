export const CAMPAIGN_PRICE_VERSION = 'v1' as const;
export const CAMPAIGN_CURRENCY = 'INR' as const;
export const CAMPAIGN_BASE_FEE_PAISE = 9900;
export const CAMPAIGN_PER_VOUCHER_FEE_PAISE = 200;
export const MIN_CAMPAIGN_QUANTITY = 1;
export const MAX_CAMPAIGN_QUANTITY = 500;

export type CampaignQuote = {
  priceVersion: typeof CAMPAIGN_PRICE_VERSION;
  currency: typeof CAMPAIGN_CURRENCY;
  baseFeePaise: number;
  perVoucherFeePaise: number;
  quantity: number;
  totalPaise: number;
};

export const quoteCampaign = (quantity: number): CampaignQuote => {
  if (!Number.isInteger(quantity) || quantity < MIN_CAMPAIGN_QUANTITY || quantity > MAX_CAMPAIGN_QUANTITY) {
    throw new Error('Quantity must be an integer from 1 to 500');
  }

  return {
    priceVersion: CAMPAIGN_PRICE_VERSION,
    currency: CAMPAIGN_CURRENCY,
    baseFeePaise: CAMPAIGN_BASE_FEE_PAISE,
    perVoucherFeePaise: CAMPAIGN_PER_VOUCHER_FEE_PAISE,
    quantity,
    totalPaise: CAMPAIGN_BASE_FEE_PAISE + CAMPAIGN_PER_VOUCHER_FEE_PAISE * quantity,
  };
};

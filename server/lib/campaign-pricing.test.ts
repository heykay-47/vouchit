import { describe, expect, it } from 'vitest';
import { quoteCampaign } from './campaign-pricing.js';

describe('campaign pricing', () => {
  it('quotes the v1 price for one voucher in integer paise', () => {
    expect(quoteCampaign(1)).toEqual({
      priceVersion: 'v1',
      currency: 'INR',
      baseFeePaise: 9900,
      perVoucherFeePaise: 200,
      quantity: 1,
      totalPaise: 10100,
    });
  });

  it('quotes the v1 price at the maximum quantity', () => {
    expect(quoteCampaign(500).totalPaise).toBe(109900);
  });

  it('rejects quantities outside the supported integer range', () => {
    expect(() => quoteCampaign(0)).toThrow('Quantity must be an integer from 1 to 500');
    expect(() => quoteCampaign(501)).toThrow('Quantity must be an integer from 1 to 500');
    expect(() => quoteCampaign(1.5)).toThrow('Quantity must be an integer from 1 to 500');
  });
});

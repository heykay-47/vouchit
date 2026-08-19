import { describe, expect, it } from 'vitest';
import {
  previewCampaignInventory,
  type CampaignInventoryCandidate,
} from './campaign-inventory.js';

const candidate = (sourceRow: number, code: string, value?: string): CampaignInventoryCandidate => ({
  sourceRow,
  code,
  ...(value === undefined ? {} : { value }),
});

describe('campaign inventory validation', () => {
  it('accepts exactly code and code,value headers', () => {
    expect(previewCampaignInventory({ headers: ['code'], rows: [candidate(2, 'WELCOME50')] })).toEqual({
      accepted: [candidate(2, 'WELCOME50')],
      rejected: [],
      totalRows: 1,
    });

    expect(previewCampaignInventory({
      headers: ['code', 'value'],
      rows: [candidate(2, 'SHIPFREE', 'Free shipping')],
    })).toEqual({
      accepted: [candidate(2, 'SHIPFREE', 'Free shipping')],
      rejected: [],
      totalRows: 1,
    });
  });

  it.each([
    ['Code'],
    ['code', 'Code'],
    ['code', 'value', 'extra'],
    ['code', 'code'],
  ])('rejects unsupported or duplicate headers: %s', (...headers: string[]) => {
    expect(() => previewCampaignInventory({ headers, rows: [] })).toThrow('CSV headers must be exactly code or code,value');
  });

  it('accepts 500 data rows and rejects a 501-row import', () => {
    const rows = Array.from({ length: 500 }, (_, index) => candidate(index + 2, `CODE-${index}`));
    expect(previewCampaignInventory({ headers: ['code'], rows }).accepted).toHaveLength(500);

    expect(() => previewCampaignInventory({
      headers: ['code'],
      rows: [...rows, candidate(502, 'TOO-MANY')],
    })).toThrow('Campaign inventory cannot contain more than 500 rows');
  });

  it('trims accepted codes and values before returning them', () => {
    expect(previewCampaignInventory({
      headers: ['code', 'value'],
      rows: [candidate(2, '  SAVE10  ', '  ₹10  ')],
    }).accepted).toEqual([candidate(2, 'SAVE10', '₹10')]);
  });

  it('rejects blank and duplicate codes with row-specific reasons', () => {
    const preview = previewCampaignInventory({
      headers: ['code'],
      rows: [
        candidate(2, 'SAVE10'),
        candidate(3, '  SAVE10 '),
        candidate(4, '   '),
      ],
    });

    expect(preview.accepted).toEqual([candidate(2, 'SAVE10')]);
    expect(preview.rejected).toEqual([
      { sourceRow: 3, code: 'SAVE10', reason: 'Duplicate code' },
      { sourceRow: 4, reason: 'Code is required' },
    ]);
  });

  it('accepts a 200-character code and rejects longer codes', () => {
    const exactlyAtLimit = 'A'.repeat(200);
    const preview = previewCampaignInventory({
      headers: ['code'],
      rows: [candidate(2, exactlyAtLimit), candidate(3, `${exactlyAtLimit}A`)],
    });

    expect(preview.accepted).toEqual([candidate(2, exactlyAtLimit)]);
    expect(preview.rejected).toEqual([{
      sourceRow: 3,
      code: `${exactlyAtLimit}A`,
      reason: 'Code must be 200 characters or fewer',
    }]);
  });
});

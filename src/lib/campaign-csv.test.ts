import { describe, expect, it } from 'vitest';
import { parseCampaignCsv } from './campaign-csv';

const file = (contents: string) => new File([contents], 'campaign.csv', { type: 'text/csv' });

describe('parseCampaignCsv', () => {
  it('preserves quoted values and source rows', async () => {
    const result = await parseCampaignCsv(file('code,value\nSAVE50,"₹50, groceries"'));

    expect(result).toEqual({
      headers: ['code', 'value'],
      rows: [{ sourceRow: 2, code: 'SAVE50', value: '₹50, groceries' }],
    });
  });

  it('parses code-only files without adding a value property', async () => {
    const result = await parseCampaignCsv(file('code\nSAVE50\nSHIPFREE'));

    expect(result).toEqual({
      headers: ['code'],
      rows: [
        { sourceRow: 2, code: 'SAVE50' },
        { sourceRow: 3, code: 'SHIPFREE' },
      ],
    });
  });

  it('preserves an empty value when the value column is present', async () => {
    const result = await parseCampaignCsv(file('code,value\nSAVE50,'));

    expect(result.rows).toEqual([{ sourceRow: 2, code: 'SAVE50', value: '' }]);
  });

  it('preserves quoted newlines and skips greedy empty lines', async () => {
    const result = await parseCampaignCsv(file('code,value\n\nSAVE50,"line one\nline two"\n\n'));

    expect(result.rows).toEqual([{
      sourceRow: 2,
      code: 'SAVE50',
      value: 'line one\nline two',
    }]);
  });

  it('rejects unsupported headers', async () => {
    await expect(parseCampaignCsv(file('value,code\n₹50,SAVE50')))
      .rejects.toThrow('CSV headers must be exactly code or code,value');
  });

  it('rejects duplicate headers', async () => {
    await expect(parseCampaignCsv(file('code,code\nSAVE50,SAVE50')))
      .rejects.toThrow('CSV headers must be exactly code or code,value');
  });

  it('maps malformed parse errors to the first data source row', async () => {
    await expect(parseCampaignCsv(file('code,value\nSAVE50,"unterminated')))
      .rejects.toMatchObject({ sourceRow: 2 });
  });
});

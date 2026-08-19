import { describe, expect, it } from 'vitest';
import { formatInvoiceDate, toSettlementDateTime } from './invoice-dates';

describe('invoice dates', () => {
  it('uses the end of a selected past calendar date for settlement', () => {
    expect(toSettlementDateTime('2026-08-18', new Date('2026-08-19T12:00:00.000Z'))).toBe(
      '2026-08-18T23:59:59.999Z',
    );
  });

  it('uses the current instant when settling on the current calendar date', () => {
    expect(toSettlementDateTime('2026-08-19', new Date('2026-08-19T12:00:00.000Z'))).toBe(
      '2026-08-19T12:00:00.000Z',
    );
  });

  it('formats invoice dates consistently for invoice summaries', () => {
    expect(formatInvoiceDate(new Date('2026-08-19T03:00:00.000Z'))).toBe('19 Aug 2026');
  });
});

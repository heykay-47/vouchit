import { describe, expect, it } from 'vitest';
import { formatInvoiceDate, getCalendarDate, toSettlementDateTime } from './invoice-dates';

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

  it('uses the user-local calendar date near an east-of-UTC midnight boundary', () => {
    const now = new Date('2026-08-18T18:45:00.000Z');

    expect(getCalendarDate(now, 'Asia/Kolkata')).toBe('2026-08-19');
    expect(toSettlementDateTime('2026-08-19', now, undefined, 'Asia/Kolkata')).toBe(now.toISOString());
  });

  it('never serializes a settlement date before invoice issuance', () => {
    const now = new Date('2026-08-19T00:30:00.000Z');
    const issuedAt = new Date('2026-08-19T01:00:00.000Z');

    expect(toSettlementDateTime('2026-08-19', now, issuedAt, 'UTC')).toBe(issuedAt.toISOString());
  });

  it('formats invoice dates consistently for invoice summaries', () => {
    expect(formatInvoiceDate(new Date('2026-08-19T03:00:00.000Z'))).toBe('19 Aug 2026');
  });
});

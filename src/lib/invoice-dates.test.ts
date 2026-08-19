import { describe, expect, it } from 'vitest';
import { formatInvoiceDate, getCalendarDate, toSettlementDateTime } from './invoice-dates';

describe('invoice dates', () => {
  it('uses the end of a selected past calendar date for settlement', () => {
    expect(toSettlementDateTime('2026-08-18', new Date('2026-08-19T12:00:00.000Z'), undefined, 'UTC')).toBe(
      '2026-08-18T23:59:59.999Z',
    );
  });

  it('uses the current instant for the default local calendar date', () => {
    const now = new Date('2026-08-19T12:00:00.000Z');
    const localToday = getCalendarDate(now);

    expect(toSettlementDateTime(localToday, now)).toBe(
      '2026-08-19T12:00:00.000Z',
    );
  });

  it('uses the user-local calendar date near an east-of-UTC midnight boundary', () => {
    const now = new Date('2026-08-18T18:45:00.000Z');

    expect(getCalendarDate(now, 'Asia/Kolkata')).toBe('2026-08-19');
    expect(toSettlementDateTime('2026-08-19', now, undefined, 'Asia/Kolkata')).toBe(now.toISOString());
  });

  it('uses local end-of-day for yesterday without producing a future timestamp', () => {
    const now = new Date('2026-08-18T18:45:00.000Z');

    expect(toSettlementDateTime('2026-08-18', now, undefined, 'Asia/Kolkata')).toBe(
      '2026-08-18T18:29:59.999Z',
    );
  });

  it('rejects a future local calendar date before serializing a payment', () => {
    expect(() => toSettlementDateTime('2026-08-20', new Date('2026-08-19T12:00:00.000Z'), undefined, 'UTC'))
      .toThrow('payment date cannot be in the future');
  });

  it('keeps a same-day settlement at or after invoice issuance', () => {
    const now = new Date('2026-08-19T01:30:00.000Z');
    const issuedAt = new Date('2026-08-19T01:00:00.000Z');

    expect(toSettlementDateTime('2026-08-19', now, issuedAt, 'UTC')).toBe(now.toISOString());
  });

  it('formats invoice dates consistently for invoice summaries', () => {
    expect(formatInvoiceDate(new Date('2026-08-19T03:00:00.000Z'))).toBe('19 Aug 2026');
  });
});

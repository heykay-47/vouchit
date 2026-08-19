import { describe, expect, it } from 'vitest';
import { formatPaiseAsInr, parseRupeesToPaise } from './money';

describe('money helpers', () => {
  it('parses rupees into exact integer paise without floating-point multiplication', () => {
    expect(parseRupeesToPaise('101.00')).toBe(10100);
    expect(parseRupeesToPaise('0.01')).toBe(1);
    expect(parseRupeesToPaise('12')).toBe(1200);
  });

  it.each(['1.234', '1e2', '-1.00', '+1.00', '₹1.00', ''])('rejects invalid rupee input %j', (value) => {
    expect(() => parseRupeesToPaise(value)).toThrow();
  });

  it('formats paise as INR using exact integer rupees and paise', () => {
    expect(formatPaiseAsInr(10100)).toBe('₹101.00');
    expect(formatPaiseAsInr(123456)).toBe('₹1,234.56');
  });
});

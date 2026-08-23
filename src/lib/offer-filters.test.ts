import { describe, expect, it } from 'vitest';
import {
  DEFAULT_OFFER_FILTERS,
  hasActiveOfferFilters,
  parseOfferFilters,
  writeOfferFilters,
} from './offer-filters';

describe('offer filter URL state', () => {
  it('parses supported URL state and ignores invalid values', () => {
    expect(parseOfferFilters(new URLSearchParams(
      'q=fresh&platform=Google+Pay&category=Shopping&source=campaign&expiring=true',
    ))).toEqual({
      q: 'fresh',
      platform: 'Google Pay',
      category: 'Shopping',
      source: 'campaign',
      expiringSoon: true,
    });

    expect(parseOfferFilters(new URLSearchParams(
      'platform=Unknown&category=Unknown&source=paid&expiring=false',
    ))).toEqual(DEFAULT_OFFER_FILTERS);
  });

  it('normalizes search text to its supported URL boundary', () => {
    const overlongQuery = `  ${'a'.repeat(101)}  `;

    expect(parseOfferFilters(new URLSearchParams({ q: overlongQuery }))).toEqual({
      ...DEFAULT_OFFER_FILTERS,
      q: 'a'.repeat(100),
    });
  });

  it('writes only non-default offer filters and preserves unrelated params', () => {
    const params = writeOfferFilters(new URLSearchParams('ref=landing'), {
      ...DEFAULT_OFFER_FILTERS,
      q: 'coffee',
      source: 'campaign',
    });

    expect(params.toString()).toBe('ref=landing&q=coffee&source=campaign');
  });

  it('replaces prior filter params in canonical order without mutating the current params', () => {
    const current = new URLSearchParams(
      'platform=Paytm&ref=landing&q=old&category=Food&source=community&expiring=true',
    );
    const params = writeOfferFilters(current, {
      q: 'new',
      platform: 'Google Pay',
      category: 'Travel',
      source: 'campaign',
      expiringSoon: true,
    });

    expect(params.toString()).toBe(
      'ref=landing&q=new&platform=Google+Pay&category=Travel&source=campaign&expiring=true',
    );
    expect(current.toString()).toBe(
      'platform=Paytm&ref=landing&q=old&category=Food&source=community&expiring=true',
    );
  });

  it('removes all canonical params when filters return to defaults', () => {
    const params = writeOfferFilters(
      new URLSearchParams('q=old&platform=Paytm&category=Food&source=community&expiring=true&ref=landing'),
      DEFAULT_OFFER_FILTERS,
    );

    expect(params.toString()).toBe('ref=landing');
  });

  it.each([
    ['search', { q: 'coffee' }],
    ['platform', { platform: 'Paytm' as const }],
    ['category', { category: 'Food' as const }],
    ['source', { source: 'community' as const }],
    ['expiry', { expiringSoon: true }],
  ])('detects an active %s filter', (_name, patch) => {
    expect(hasActiveOfferFilters({ ...DEFAULT_OFFER_FILTERS, ...patch })).toBe(true);
  });

  it('reports canonical defaults as inactive', () => {
    expect(hasActiveOfferFilters(DEFAULT_OFFER_FILTERS)).toBe(false);
  });
});

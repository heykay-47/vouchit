import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import {
  buildCursorMatch,
  buildOfferPipeline,
  buildPublicMatch,
  buildSearchMatch,
  buildViewerClaimStages,
  escapeSearchPattern,
  parseOfferQuery,
} from './offer-query.js';

const now = new Date('2026-08-23T00:00:00.000Z');

describe('offer query primitives', () => {
  it('parses bounded canonical offer filters', () => {
    expect(parseOfferQuery({
      q: '  fresh.*  ',
      platform: 'Google Pay',
      category: 'Shopping',
      source: 'campaign',
      expiringSoon: 'true',
      limit: '24',
    })).toMatchObject({
      q: 'fresh.*',
      platform: 'Google Pay',
      category: 'Shopping',
      source: 'campaign',
      expiringSoon: true,
      limit: 24,
    });
    expect(escapeSearchPattern('fresh.*[deal]')).toBe('fresh\\.\\*\\[deal\\]');
  });

  it.each([
    { unknown: 'field' },
    { q: ['one', 'two'] },
    { q: 'x'.repeat(101) },
    { cursor: 'x'.repeat(513) },
    { expiringSoon: '1' },
    { limit: '0' },
    { limit: '49' },
  ])('rejects malformed query %j as a Zod error', (query) => {
    expect(() => parseOfferQuery(query)).toThrow(ZodError);
  });

  it('builds a source and canonical field match without private fields', () => {
    expect(buildPublicMatch({
      source: 'campaign',
      platform: 'Google Pay',
      category: 'Shopping',
      expiringSoon: false,
      now,
    })).toEqual({
      $match: {
        kind: 'campaign',
        platform: 'Google Pay',
        category: 'Shopping',
      },
    });
  });

  it('builds literal case-insensitive search across public text only', () => {
    expect(buildSearchMatch('fresh.*')).toEqual({
      $match: {
        $or: [
          { title: { $regex: 'fresh\\.\\*', $options: 'i' } },
          { description: { $regex: 'fresh\\.\\*', $options: 'i' } },
          { brandName: { $regex: 'fresh\\.\\*', $options: 'i' } },
          { organizationName: { $regex: 'fresh\\.\\*', $options: 'i' } },
        ],
      },
    });
  });

  it('builds a strict cursor boundary for the stable tuple', () => {
    const stage = buildCursorMatch({
      version: 1,
      missingExpiry: 0,
      expiryDate: new Date('2026-09-01T00:00:00.000Z'),
      kind: 'campaign',
      id: '507f1f77bcf86cd799439011',
    });

    expect(stage).toMatchObject({ $match: { $or: expect.any(Array) } });
    expect(JSON.stringify(stage)).toContain('missingExpiry');
    expect(JSON.stringify(stage)).toContain('expiryDate');
    expect(JSON.stringify(stage)).toContain('kind');
  });

  it('builds viewer-only claim stages without exposing claimant data', () => {
    const stages = buildViewerClaimStages('507f1f77bcf86cd799439022');

    expect(stages[0]).toMatchObject({ $lookup: { from: 'redeemedvouchers' } });
    expect(stages.at(-1)).toEqual({ $unset: 'viewerClaims' });
    expect(JSON.stringify(stages)).not.toContain('redeemedBy');
  });

  it('places public filters, search, cursor, and viewer stages before the facet', () => {
    const pipeline = buildOfferPipeline({
      source: 'campaign',
      expiringSoon: false,
      limit: 24,
      now,
      q: 'fresh.*',
      cursor: undefined,
      viewerId: '507f1f77bcf86cd799439022',
    });
    const unionIndex = pipeline.findIndex((stage) => '$unionWith' in stage);
    const facetIndex = pipeline.findIndex((stage) => '$facet' in stage);
    const publicIndex = pipeline.findIndex((stage) => '$match' in stage
      && 'kind' in (stage.$match as Record<string, unknown>));
    const searchIndex = pipeline.findIndex((stage) => JSON.stringify(stage).includes('$regex'));

    expect(unionIndex).toBeGreaterThanOrEqual(0);
    expect(publicIndex).toBeGreaterThan(unionIndex);
    expect(searchIndex).toBeGreaterThan(unionIndex);
    expect(facetIndex).toBeGreaterThan(searchIndex);
    expect(facetIndex).toBeGreaterThan(publicIndex);
    expect(pipeline[facetIndex]).toEqual({
      $facet: {
        metadata: [{ $count: 'total' }],
        page: [{ $limit: 24 }],
      },
    });

    const pipelineText = JSON.stringify(pipeline);
    expect(pipelineText).not.toContain('"code"');
    expect(pipelineText).not.toContain('"voucherId"');
    expect(pipelineText).not.toContain('"redeemedBy"');
  });
});

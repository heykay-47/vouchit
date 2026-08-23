import { describe, expect, it } from 'vitest';
import { cursorRowFor, decodeOfferCursor, encodeOfferCursor } from './offer-cursor.js';

describe('offer cursors', () => {
  it('round-trips the stable offer tuple', () => {
    const cursor = encodeOfferCursor({
      missingExpiry: 0,
      expiryDate: new Date('2026-09-01T00:00:00.000Z'),
      kind: 'campaign',
      id: '507f1f77bcf86cd799439011',
    });

    expect(decodeOfferCursor(cursor)).toEqual({
      version: 1,
      missingExpiry: 0,
      expiryDate: new Date('2026-09-01T00:00:00.000Z'),
      kind: 'campaign',
      id: '507f1f77bcf86cd799439011',
    });
  });

  it.each(['not-base64', Buffer.from('{}').toString('base64url')])(
    'rejects invalid cursor %s',
    (cursor) => expect(() => decodeOfferCursor(cursor)).toThrow('Invalid offer cursor'),
  );

  it('rejects a cursor whose expiry marker disagrees with its date', () => {
    const cursor = Buffer.from(JSON.stringify({
      v: 1,
      m: 1,
      e: '2026-09-01T00:00:00.000Z',
      k: 'campaign',
      i: '507f1f77bcf86cd799439011',
    })).toString('base64url');

    expect(() => decodeOfferCursor(cursor)).toThrow('Invalid offer cursor');
  });

  it('normalizes an aggregate id for cursor encoding', () => {
    expect(cursorRowFor({
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      missingExpiry: 1,
      expiryDate: null,
      kind: 'community',
    })).toEqual({
      missingExpiry: 1,
      expiryDate: null,
      kind: 'community',
      id: '507f1f77bcf86cd799439011',
    });
  });
});

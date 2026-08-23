import mongoose from 'mongoose';
import { z } from 'zod';
import { ApiError } from './http.js';

export type OfferCursorRow = {
  missingExpiry: 0 | 1;
  expiryDate: Date | null;
  kind: 'community' | 'campaign';
  id: string;
};

export type OfferCursor = OfferCursorRow & { version: 1 };

const cursorSchema = z.object({
  v: z.literal(1),
  m: z.union([z.literal(0), z.literal(1)]),
  e: z.string().datetime().nullable(),
  k: z.enum(['community', 'campaign']),
  i: z.string().refine(mongoose.isValidObjectId),
});

export const encodeOfferCursor = (row: OfferCursorRow) => Buffer.from(JSON.stringify({
  v: 1,
  m: row.missingExpiry,
  e: row.expiryDate?.toISOString() ?? null,
  k: row.kind,
  i: row.id,
})).toString('base64url');

export const decodeOfferCursor = (value: string): OfferCursor => {
  try {
    const parsed = cursorSchema.parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')));
    if ((parsed.m === 0) !== (parsed.e !== null)) throw new Error('inconsistent expiry');
    return {
      version: 1,
      missingExpiry: parsed.m,
      expiryDate: parsed.e ? new Date(parsed.e) : null,
      kind: parsed.k,
      id: parsed.i,
    };
  } catch {
    throw new ApiError(400, 'Invalid offer cursor');
  }
};

export const cursorRowFor = (row: {
  _id: { toString(): string };
  missingExpiry: 0 | 1;
  expiryDate: Date | null;
  kind: 'community' | 'campaign';
}): OfferCursorRow => ({
  id: row._id.toString(),
  missingExpiry: row.missingExpiry,
  expiryDate: row.expiryDate,
  kind: row.kind,
});

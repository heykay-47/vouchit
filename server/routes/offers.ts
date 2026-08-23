import { Router } from 'express';
import type { PipelineStage } from 'mongoose';
import { connectDb } from '../lib/db.js';
import { cursorRowFor, decodeOfferCursor, encodeOfferCursor } from '../lib/offer-cursor.js';
import { asyncRoute, ok } from '../lib/http.js';
import { buildOfferPipeline, parseOfferQuery, type OfferAggregateRow } from '../lib/offer-query.js';
import { toPublicOffer } from '../lib/offer-serializer.js';
import { resolveUserRole } from '../lib/roles.js';
import { getOptionalUserId, optionalAuth } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { Voucher } from '../models/Voucher.js';

const router = Router();

router.get('/', optionalAuth, asyncRoute(async (req, res) => {
  const parsed = parseOfferQuery(req.query);
  await connectDb();
  const viewerId = getOptionalUserId(req);
  const viewer = viewerId
    ? await User.findById(viewerId).select('role').lean() as { role?: unknown } | null
    : null;
  const viewerRole = viewer ? resolveUserRole(viewer.role) : undefined;
  const cursor = parsed.cursor ? decodeOfferCursor(parsed.cursor) : undefined;
  const pipeline = buildOfferPipeline({
    ...parsed,
    cursor,
    now: new Date(),
    viewerId,
    viewerRole,
  }) as unknown as PipelineStage[];
  const [result = { metadata: [], page: [] }] = await Voucher.aggregate(
    pipeline,
  );
  const rows = result.page as OfferAggregateRow[];
  const hasMore = rows.length > parsed.limit;
  const visibleRows = rows.slice(0, parsed.limit);
  const last = visibleRows.at(-1);

  ok(res, {
    offers: visibleRows.map((row) => toPublicOffer(row, viewerId)),
    total: result.metadata[0]?.total ?? 0,
    nextCursor: hasMore && last ? encodeOfferCursor(cursorRowFor(last)) : null,
    hasMore,
  });
}));

export { router as offersRouter };

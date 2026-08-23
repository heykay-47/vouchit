import { Router } from 'express';
import type { PipelineStage } from 'mongoose';
import { connectDb } from '../lib/db.js';
import { cursorRowFor, encodeOfferCursor } from '../lib/offer-cursor.js';
import { asyncRoute, ok } from '../lib/http.js';
import { buildOfferPipeline, parseOfferQuery, type OfferAggregateRow } from '../lib/offer-query.js';
import { toPublicOffer } from '../lib/offer-serializer.js';
import { getOptionalUserId, optionalAuth } from '../middleware/auth.js';
import { Voucher } from '../models/Voucher.js';

const router = Router();

router.get('/', optionalAuth, asyncRoute(async (req, res) => {
  const parsed = parseOfferQuery(req.query);
  await connectDb();
  const viewerId = getOptionalUserId(req);
  const pipeline = buildOfferPipeline({ ...parsed, now: new Date(), viewerId }) as unknown as PipelineStage[];
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

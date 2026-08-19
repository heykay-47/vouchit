import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { connectDb } from '../lib/db.js';
import {
  previewCampaignInventory,
  type CampaignInventoryCandidate,
} from '../lib/campaign-inventory.js';
import { toCampaignResponse } from '../lib/business-serializers.js';
import { ApiError, asyncRoute, ok } from '../lib/http.js';
import { withTransaction } from '../lib/transaction.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { BusinessProfile } from '../models/BusinessProfile.js';
import { Campaign, type CampaignDocument } from '../models/Campaign.js';
import { Voucher } from '../models/Voucher.js';

const router = Router();

const platforms = ['Google Pay', 'Paytm', 'PhonePe', 'Other'] as const;
const categories = ['Food', 'Shopping', 'Travel', 'Entertainment', 'Electronics', 'Health', 'Other'] as const;

const futureDate = z.string().datetime().refine(
  (value) => new Date(value).getTime() > Date.now(),
  'Expiry date must be in the future',
).transform((value) => new Date(value));

const imageUrl = z.string().url().refine(
  (value) => value.startsWith('https://') || value.startsWith('data:image/'),
  'Image URL must be https or a data:image URL',
);

const campaignSchema = z.object({
  title: z.string().trim().min(1).max(120),
  brandName: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(1000),
  terms: z.string().trim().min(1).max(2000),
  platform: z.enum(platforms),
  category: z.enum(categories),
  imageUrl,
  expiryDate: futureDate,
}).strict();

const campaignPatchSchema = campaignSchema.partial().strict().refine(
  (value) => Object.keys(value).length > 0,
  'At least one campaign field is required',
);

const inventoryCandidateSchema = z.object({
  sourceRow: z.number().int().min(2),
  code: z.string(),
  value: z.string().optional(),
}).strict();

const previewSchema = z.object({
  headers: z.array(z.string()),
  rows: z.array(inventoryCandidateSchema),
}).strict();

const confirmationSchema = z.object({
  rows: z.array(inventoryCandidateSchema),
}).strict();

const userIdFrom = (req: AuthedRequest) => req.userId;

const idFor = (value: unknown) => value?.toString?.() ?? String(value);

const campaignWorkspace = async (campaign: CampaignDocument) => {
  const inventoryCount = await Voucher.countDocuments({
    campaignId: campaign._id,
    sourceType: 'campaign',
  });

  return {
    ...toCampaignResponse(campaign),
    inventoryCount,
    invoice: null,
    analytics: null,
  };
};

const requireOwnedCampaign = async (req: AuthedRequest) => {
  const campaignId = req.params.id;
  if (!mongoose.isValidObjectId(campaignId)) {
    throw new ApiError(400, 'Invalid campaign id');
  }

  await connectDb();
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) {
    throw new ApiError(404, 'Campaign not found');
  }

  if (idFor(campaign.businessId) !== userIdFrom(req)) {
    throw new ApiError(403, 'Forbidden');
  }

  return campaign;
};

const requireDraft = (campaign: CampaignDocument) => {
  if (campaign.status !== 'draft' || campaign.lockedAt) {
    throw new ApiError(409, 'Campaign is locked');
  }
};

router.use(requireAuth, requireRole('business'));

router.get('/campaigns', asyncRoute(async (req, res) => {
  await connectDb();
  const businessId = userIdFrom(req as AuthedRequest);
  const campaigns = await Campaign.find({ businessId }).sort({ createdAt: -1 }).lean();
  ok(res, { campaigns: await Promise.all(campaigns.map(campaignWorkspace)) });
}));

router.post('/campaigns', asyncRoute(async (req, res) => {
  await connectDb();
  const input = campaignSchema.parse(req.body);
  const businessId = userIdFrom(req as AuthedRequest);
  const profile = await BusinessProfile.findOne({ userId: businessId });
  if (!profile) {
    throw new ApiError(404, 'Business profile not found');
  }

  const campaign = await Campaign.create({
    ...input,
    businessId,
    businessProfileId: profile._id,
    status: 'draft',
    lockedAt: null,
  });

  ok(res, { campaign: await campaignWorkspace(campaign) }, 201);
}));

router.get('/campaigns/:id', asyncRoute(async (req, res) => {
  const campaign = await requireOwnedCampaign(req as AuthedRequest);
  ok(res, { campaign: await campaignWorkspace(campaign) });
}));

router.patch('/campaigns/:id', asyncRoute(async (req, res) => {
  const authedReq = req as AuthedRequest;
  const campaign = await requireOwnedCampaign(authedReq);
  requireDraft(campaign);
  const input = campaignPatchSchema.parse(req.body);
  const updated = await Campaign.findByIdAndUpdate(
    req.params.id,
    { $set: input },
    { new: true, runValidators: true },
  );

  if (!updated) {
    throw new ApiError(404, 'Campaign not found');
  }

  ok(res, { campaign: await campaignWorkspace(updated) });
}));

router.post('/campaigns/:id/inventory/preview', asyncRoute(async (req, res) => {
  const campaign = await requireOwnedCampaign(req as AuthedRequest);
  requireDraft(campaign);
  const input = previewSchema.parse(req.body) as {
    headers: string[];
    rows: CampaignInventoryCandidate[];
  };
  const preview = previewCampaignInventory(input);
  ok(res, { preview });
}));

router.put('/campaigns/:id/inventory', asyncRoute(async (req, res) => {
  const authedReq = req as AuthedRequest;
  const campaign = await requireOwnedCampaign(authedReq);
  requireDraft(campaign);
  const { rows } = confirmationSchema.parse(req.body) as { rows: CampaignInventoryCandidate[] };
  const preview = previewCampaignInventory({ headers: ['code', 'value'], rows });

  if (preview.rejected.length > 0) {
    throw new ApiError(400, 'Inventory contains rejected rows', { rejected: preview.rejected });
  }

  if (preview.accepted.length === 0) {
    throw new ApiError(400, 'Inventory must contain at least one accepted row', { rejected: [] });
  }

  const campaignId = req.params.id;
  const businessId = userIdFrom(authedReq);
  await withTransaction(async (session) => {
    await Voucher.deleteMany({ campaignId, sourceType: 'campaign' }, { session });
    await Voucher.create(
      preview.accepted.map((row: CampaignInventoryCandidate) => ({
        sourceType: 'campaign',
        campaignId,
        code: row.code,
        ...(row.value === undefined ? {} : { value: row.value }),
        donatedBy: businessId,
        expiryDate: campaign.expiryDate,
        isActive: false,
      })),
      { session },
    );
  });

  ok(res, { campaign: await campaignWorkspace(campaign) });
}));

export { router as businessRouter };

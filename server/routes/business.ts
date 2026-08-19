import { Router } from 'express';
import mongoose, { type ClientSession } from 'mongoose';
import { z } from 'zod';
import { connectDb } from '../lib/db.js';
import {
  previewCampaignInventory,
  type CampaignInventoryCandidate,
} from '../lib/campaign-inventory.js';
import { calculateCampaignAnalytics } from '../lib/campaign-analytics.js';
import { quoteCampaign } from '../lib/campaign-pricing.js';
import { toCampaignResponse } from '../lib/business-serializers.js';
import { ApiError, asyncRoute, ok } from '../lib/http.js';
import { withTransaction } from '../lib/transaction.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { BusinessProfile, type BusinessProfileDocument } from '../models/BusinessProfile.js';
import { Campaign, type CampaignDocument } from '../models/Campaign.js';
import { Invoice, type InvoiceDocument } from '../models/Invoice.js';
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

const settlementSchema = z.object({
  amountPaise: z.number().int().positive(),
  externalPaymentReference: z.string().trim().min(1).max(120),
  externalPaymentDate: z.string().datetime(),
}).strict();

const userIdFrom = (req: AuthedRequest) => req.userId;

const idFor = (value: unknown) => value?.toString?.() ?? String(value);

const requireBusinessProfile = async (
  businessId: string,
  expectedProfileId?: unknown,
  session?: ClientSession,
) => {
  const query = {
    userId: businessId,
    ...(expectedProfileId === undefined ? {} : { _id: expectedProfileId }),
  };
  const profile = session
    ? await BusinessProfile.findOne(query, null, { session })
    : await BusinessProfile.findOne(query);
  if (!profile || (
    expectedProfileId !== undefined
    && idFor(profile._id) !== idFor(expectedProfileId)
  )) {
    throw new ApiError(404, 'Business profile not found');
  }
  return profile;
};

const campaignWorkspace = async (
  campaign: CampaignDocument,
  profile: BusinessProfileDocument,
  data?: { vouchers?: Record<string, unknown>[]; invoice?: InvoiceDocument | null },
) => {
  if (idFor(campaign.businessProfileId) !== idFor(profile._id)) {
    throw new ApiError(404, 'Business profile not found');
  }

  const vouchers = data?.vouchers ?? [];
  const inventoryCount = data?.vouchers
    ? vouchers.length
    : await Voucher.countDocuments({
        campaignId: campaign._id,
        sourceType: 'campaign',
      });
  const invoice = data?.invoice ?? null;
  const campaignResponse = toCampaignResponse(campaign, profile.organizationName);
  const analytics = invoice?.status === 'paid'
    && (campaignResponse.effectiveStatus === 'active' || campaignResponse.effectiveStatus === 'completed')
    ? calculateCampaignAnalytics(vouchers, invoice)
    : null;

  return {
    ...campaignResponse,
    inventoryCount,
    invoice: invoice ? toInvoiceResponse(invoice) : null,
    analytics,
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

const draftCampaignFilter = (
  campaignId: string,
  businessId: string,
  businessProfileId: unknown,
) => ({
  _id: campaignId,
  businessId,
  businessProfileId,
  status: 'draft',
  lockedAt: null,
});

const toInvoiceResponse = (invoice: InvoiceDocument) => ({
  id: idFor(invoice._id),
  campaignId: idFor(invoice.campaignId),
  businessId: idFor(invoice.businessId),
  priceVersion: invoice.priceVersion,
  currency: invoice.currency,
  baseFeePaise: invoice.baseFeePaise,
  perVoucherFeePaise: invoice.perVoucherFeePaise,
  quantity: invoice.quantity,
  totalPaise: invoice.totalPaise,
  status: invoice.status,
  issuedAt: invoice.issuedAt,
  ...(invoice.paidAt ? { paidAt: invoice.paidAt } : {}),
  ...(invoice.externalPaymentReference ? { externalPaymentReference: invoice.externalPaymentReference } : {}),
  ...(invoice.externalPaymentDate ? { externalPaymentDate: invoice.externalPaymentDate } : {}),
});

const isDuplicateKeyError = (error: unknown) => (
  typeof error === 'object'
  && error !== null
  && (error as { code?: number }).code === 11000
);

const validateSettlement = (
  invoice: InvoiceDocument,
  input: z.infer<typeof settlementSchema>,
  now: Date,
) => {
  if (input.amountPaise !== invoice.totalPaise) {
    throw new ApiError(409, 'Settlement amount does not match invoice total');
  }

  const paymentDate = new Date(input.externalPaymentDate);
  const issuedAt = new Date(invoice.issuedAt);
  if (paymentDate.getTime() < issuedAt.getTime() || paymentDate.getTime() > now.getTime()) {
    throw new ApiError(409, 'Payment date must be between invoice issue and now');
  }

  return paymentDate;
};

const settlementMatchesPaidInvoice = (
  invoice: InvoiceDocument,
  input: z.infer<typeof settlementSchema>,
) => (
  input.amountPaise === invoice.totalPaise
  && invoice.externalPaymentReference === input.externalPaymentReference
  && invoice.externalPaymentDate instanceof Date
  && invoice.externalPaymentDate.getTime() === new Date(input.externalPaymentDate).getTime()
);

router.use(requireAuth, requireRole('business'));

router.get('/campaigns', asyncRoute(async (req, res) => {
  await connectDb();
  const businessId = userIdFrom(req as AuthedRequest);
  const campaigns = await Campaign.find({ businessId }).sort({ createdAt: -1 }).lean();
  const profile = campaigns.length > 0 ? await requireBusinessProfile(businessId) : null;

  const campaignIds = campaigns.map((campaign) => idFor(campaign._id));
  const [campaignVouchers, campaignInvoices] = campaignIds.length > 0
    ? await Promise.all([
        Voucher.find({ campaignId: { $in: campaignIds }, sourceType: 'campaign' }).lean(),
        Invoice.find({ campaignId: { $in: campaignIds }, businessId }).lean(),
      ])
    : [[], []];
  const vouchersByCampaign = new Map<string, Record<string, unknown>[]>();
  campaignVouchers.forEach((voucher: Record<string, unknown>) => {
    const campaignId = idFor(voucher.campaignId);
    const current = vouchersByCampaign.get(campaignId) ?? [];
    current.push(voucher);
    vouchersByCampaign.set(campaignId, current);
  });
  const invoicesByCampaign = new Map<string, InvoiceDocument>();
  campaignInvoices.forEach((invoice: InvoiceDocument) => {
    invoicesByCampaign.set(idFor(invoice.campaignId), invoice);
  });

  ok(res, {
    campaigns: profile
      ? await Promise.all(campaigns.map((campaign) => campaignWorkspace(campaign, profile, {
          vouchers: vouchersByCampaign.get(idFor(campaign._id)) ?? [],
          invoice: invoicesByCampaign.get(idFor(campaign._id)) ?? null,
        })))
      : [],
  });
}));

router.post('/campaigns', asyncRoute(async (req, res) => {
  await connectDb();
  const input = campaignSchema.parse(req.body);
  const businessId = userIdFrom(req as AuthedRequest);
  const profile = await requireBusinessProfile(businessId);

  const campaign = await Campaign.create({
    ...input,
    businessId,
    businessProfileId: profile._id,
    status: 'draft',
    lockedAt: null,
  });

  ok(res, { campaign: await campaignWorkspace(campaign, profile) }, 201);
}));

router.get('/campaigns/:id', asyncRoute(async (req, res) => {
  const campaign = await requireOwnedCampaign(req as AuthedRequest);
  const profile = await requireBusinessProfile(idFor(campaign.businessId));
  const [vouchers, invoice] = await Promise.all([
    Voucher.find({ campaignId: campaign._id, sourceType: 'campaign' }).lean(),
    Invoice.findOne({ campaignId: campaign._id, businessId: campaign.businessId }),
  ]);
  ok(res, { campaign: await campaignWorkspace(campaign, profile, { vouchers, invoice }) });
}));

router.patch('/campaigns/:id', asyncRoute(async (req, res) => {
  const authedReq = req as AuthedRequest;
  const campaign = await requireOwnedCampaign(authedReq);
  requireDraft(campaign);
  await requireBusinessProfile(
    authedReq.userId,
    campaign.businessProfileId,
  );
  const input = campaignPatchSchema.parse(req.body);
  const result = await withTransaction(async (session) => {
    const currentProfile = await requireBusinessProfile(
      authedReq.userId,
      campaign.businessProfileId,
      session,
    );
    const current = await Campaign.findOneAndUpdate(
      draftCampaignFilter(req.params.id, authedReq.userId, currentProfile._id),
      { $set: input },
      { new: true, runValidators: true, session },
    );

    if (!current) {
      throw new ApiError(409, 'Campaign is locked');
    }

    return { campaign: current, profile: currentProfile };
  });

  if (!result.campaign) {
    throw new ApiError(404, 'Campaign not found');
  }

  ok(res, { campaign: await campaignWorkspace(result.campaign, result.profile) });
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
  const businessId = userIdFrom(authedReq);
  await requireBusinessProfile(businessId, campaign.businessProfileId);
  const { rows } = confirmationSchema.parse(req.body) as { rows: CampaignInventoryCandidate[] };
  const preview = previewCampaignInventory({ headers: ['code', 'value'], rows });

  if (preview.rejected.length > 0) {
    throw new ApiError(400, 'Inventory contains rejected rows', { rejected: preview.rejected });
  }

  if (preview.accepted.length === 0) {
    throw new ApiError(400, 'Inventory must contain at least one accepted row', { rejected: [] });
  }

  const campaignId = req.params.id;
  const result = await withTransaction(async (session) => {
    const currentProfile = await requireBusinessProfile(
      businessId,
      campaign.businessProfileId,
      session,
    );
    const currentCampaign = await Campaign.findOneAndUpdate(
      draftCampaignFilter(campaignId, businessId, currentProfile._id),
      { $set: { updatedAt: new Date() } },
      { new: true, session },
    );

    if (!currentCampaign) {
      throw new ApiError(409, 'Campaign is locked');
    }

    await Voucher.deleteMany({ campaignId, sourceType: 'campaign' }, { session });
    await Voucher.create(
      preview.accepted.map((row: CampaignInventoryCandidate) => ({
        sourceType: 'campaign',
        campaignId,
        code: row.code,
        ...(row.value === undefined ? {} : { value: row.value }),
        donatedBy: businessId,
        expiryDate: currentCampaign.expiryDate,
        isActive: false,
      })),
      { session },
    );

    return { campaign: currentCampaign, profile: currentProfile };
  });

  ok(res, { campaign: await campaignWorkspace(result.campaign, result.profile) });
}));

router.post('/campaigns/:id/invoice', asyncRoute(async (req, res) => {
  const authedReq = req as AuthedRequest;
  await requireOwnedCampaign(authedReq);

  const campaignId = req.params.id;
  const businessId = userIdFrom(authedReq);
  let result: { invoice: InvoiceDocument; created: boolean };

  try {
    result = await withTransaction(async (session) => {
      const campaign = await Campaign.findOne(
        { _id: campaignId, businessId },
        null,
        { session },
      );
      if (!campaign) {
        throw new ApiError(404, 'Campaign not found');
      }

      const existing = await Invoice.findOne(
        { campaignId, businessId },
        null,
        { session },
      );
      if (existing) {
        return { invoice: existing, created: false };
      }

      requireDraft(campaign);
      const quantity = await Voucher.countDocuments(
        { campaignId, sourceType: 'campaign' },
        { session },
      );
      if (quantity === 0) {
        throw new ApiError(409, 'Campaign inventory is required');
      }

      const invoice = (await Invoice.create([
        { campaignId, businessId, ...quoteCampaign(quantity) },
      ], { session }))[0];
      const lockedAt = new Date();
      const lockedCampaign = await Campaign.findOneAndUpdate(
        { _id: campaignId, businessId, status: 'draft', lockedAt: null },
        { $set: { status: 'awaiting_payment', lockedAt } },
        { new: true, session },
      );
      if (!lockedCampaign) {
        throw new ApiError(409, 'Campaign is locked');
      }

      return { invoice, created: true };
    });
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }

    const winner = await Invoice.findOne({ campaignId, businessId });
    if (!winner) {
      throw error;
    }
    result = { invoice: winner, created: false };
  }

  ok(res, { invoice: toInvoiceResponse(result.invoice) }, result.created ? 201 : 200);
}));

router.post('/invoices/:id/settlement', asyncRoute(async (req, res) => {
  const authedReq = req as AuthedRequest;
  const invoiceId = req.params.id;
  if (!mongoose.isValidObjectId(invoiceId)) {
    throw new ApiError(400, 'Invalid invoice id');
  }

  await connectDb();
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    throw new ApiError(404, 'Invoice not found');
  }

  const businessId = userIdFrom(authedReq);
  if (idFor(invoice.businessId) !== businessId) {
    throw new ApiError(403, 'Forbidden');
  }

  const input = settlementSchema.parse(req.body);
  const now = new Date();
  validateSettlement(invoice, input, now);

  const result = await withTransaction(async (session) => {
    const currentInvoice = await Invoice.findOne(
      { _id: invoiceId, businessId },
      null,
      { session },
    );
    if (!currentInvoice) {
      throw new ApiError(404, 'Invoice not found');
    }

    if (currentInvoice.status === 'paid') {
      if (!settlementMatchesPaidInvoice(currentInvoice, input)) {
        throw new ApiError(409, 'Settlement conflicts with existing payment');
      }

      const campaign = await Campaign.findOne(
        { _id: currentInvoice.campaignId, businessId },
        null,
        { session },
      );
      if (!campaign) {
        throw new ApiError(409, 'Campaign is unavailable');
      }
      const profile = await requireBusinessProfile(businessId, campaign.businessProfileId, session);
      return { invoice: currentInvoice, campaign, profile };
    }

    if (currentInvoice.status !== 'issued') {
      throw new ApiError(409, 'Invoice is unavailable for settlement');
    }
    const paymentDate = validateSettlement(currentInvoice, input, now);
    const paidInvoice = await Invoice.findOneAndUpdate(
      { _id: invoiceId, businessId, status: 'issued' },
      {
        $set: {
          status: 'paid',
          paidAt: now,
          externalPaymentReference: input.externalPaymentReference,
          externalPaymentDate: paymentDate,
        },
      },
      { new: true, session },
    );
    if (!paidInvoice) {
      throw new ApiError(409, 'Invoice is unavailable for settlement');
    }

    const campaign = await Campaign.findOneAndUpdate(
      { _id: currentInvoice.campaignId, businessId, status: 'awaiting_payment' },
      { $set: { status: 'active' } },
      { new: true, session },
    );
    if (!campaign) {
      throw new ApiError(409, 'Campaign is unavailable');
    }

    const activation = await Voucher.updateMany(
      { campaignId: currentInvoice.campaignId, sourceType: 'campaign', isActive: false },
      { $set: { isActive: true } },
      { session },
    );
    if (activation.matchedCount !== currentInvoice.quantity) {
      throw new ApiError(409, 'Campaign inventory is incomplete');
    }

    const profile = await requireBusinessProfile(businessId, campaign.businessProfileId, session);
    return { invoice: paidInvoice, campaign, profile };
  });

  ok(res, {
    invoice: toInvoiceResponse(result.invoice),
    campaign: toCampaignResponse(result.campaign, result.profile.organizationName),
  });
}));

export { router as businessRouter };

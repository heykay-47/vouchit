import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const DAY_MS = 24 * 60 * 60 * 1000;

const addDays = (date, days) => new Date(date.getTime() + days * DAY_MS);

const voucherImages = {
  food: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80',
  shopping: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=900&q=80',
  travel: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80',
  payments: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=80',
};

export const buildDemoFixtures = (now = new Date()) => {
  const activeExpiry = addDays(now, 30);
  const completedExpiry = addDays(now, -1);
  const activeCampaignKey = 'active-campaign';
  const completedCampaignKey = 'completed-campaign';

  const users = [
    {
      seedKey: 'customer-user',
      email: 'demo@vouchit.app',
      username: 'demo_recruiter',
      role: 'customer',
      bio: 'Recruiter demo account with sample favorites, redemptions, and notifications.',
    },
    {
      seedKey: 'business-user',
      email: 'business@vouchit.app',
      username: 'demo_business',
      role: 'business',
      bio: 'Business demo account with campaign, inventory, settlement, and analytics evidence.',
    },
    {
      seedKey: 'maya-user',
      email: 'maya@vouchit.app',
      username: 'maya_saves',
      role: 'customer',
      bio: 'Shares grocery and food delivery offers with the community.',
    },
    {
      seedKey: 'arjun-user',
      email: 'arjun@vouchit.app',
      username: 'arjun_deals',
      role: 'customer',
      bio: 'Finds travel, payments, and shopping vouchers before they expire.',
    },
  ];

  const campaigns = [
    {
      seedKey: activeCampaignKey,
      businessUserKey: 'business-user',
      businessProfileKey: 'business-profile',
      title: 'Weekend coffee campaign',
      brandName: 'Demo Coffee Co.',
      description: 'A campaign inventory with both claimed and remaining vouchers.',
      terms: 'Valid at participating locations before the campaign expiry date.',
      platform: 'Google Pay',
      category: 'Food',
      imageUrl: voucherImages.food,
      expiryDate: activeExpiry,
      status: 'active',
      lockedAt: addDays(now, -5),
    },
    {
      seedKey: completedCampaignKey,
      businessUserKey: 'business-user',
      businessProfileKey: 'business-profile',
      title: 'Expired travel campaign',
      brandName: 'Demo Travel Co.',
      description: 'A completed campaign retained as historical outcome evidence.',
      terms: 'Historical demo campaign; its inventory has expired.',
      platform: 'Other',
      category: 'Travel',
      imageUrl: voucherImages.travel,
      expiryDate: completedExpiry,
      status: 'completed',
      lockedAt: addDays(now, -12),
    },
  ];

  const vouchers = [
    {
      campaignKey: activeCampaignKey,
      naturalKey: { campaignId: activeCampaignKey, code: 'COFFEE-CLAIMED-DEMO' },
      code: 'COFFEE-CLAIMED-DEMO',
      donatedByKey: 'business-user',
      expiryDate: activeExpiry,
      value: '20% off',
      isRedeemed: true,
      redeemedByKey: 'customer-user',
      redeemedAt: addDays(now, -2),
      isActive: true,
      viewCount: 18,
    },
    {
      campaignKey: activeCampaignKey,
      naturalKey: { campaignId: activeCampaignKey, code: 'COFFEE-REMAINING-01' },
      code: 'COFFEE-REMAINING-01',
      donatedByKey: 'business-user',
      expiryDate: activeExpiry,
      value: '20% off',
      isRedeemed: false,
      redeemedByKey: null,
      redeemedAt: null,
      isActive: true,
      viewCount: 11,
    },
    {
      campaignKey: activeCampaignKey,
      naturalKey: { campaignId: activeCampaignKey, code: 'COFFEE-REMAINING-02' },
      code: 'COFFEE-REMAINING-02',
      donatedByKey: 'business-user',
      expiryDate: activeExpiry,
      value: '20% off',
      isRedeemed: false,
      redeemedByKey: null,
      redeemedAt: null,
      isActive: true,
      viewCount: 7,
    },
    {
      campaignKey: completedCampaignKey,
      naturalKey: { campaignId: completedCampaignKey, code: 'TRAVEL-CLAIMED-DEMO' },
      code: 'TRAVEL-CLAIMED-DEMO',
      donatedByKey: 'business-user',
      expiryDate: completedExpiry,
      value: 'Rs. 500 off',
      isRedeemed: true,
      redeemedByKey: 'customer-user',
      redeemedAt: addDays(now, -3),
      isActive: true,
      viewCount: 9,
    },
    {
      campaignKey: completedCampaignKey,
      naturalKey: { campaignId: completedCampaignKey, code: 'TRAVEL-EXPIRED-02' },
      code: 'TRAVEL-EXPIRED-02',
      donatedByKey: 'business-user',
      expiryDate: completedExpiry,
      value: 'Rs. 500 off',
      isRedeemed: false,
      redeemedByKey: null,
      redeemedAt: null,
      isActive: true,
      viewCount: 4,
    },
    {
      code: 'GPLAY20-DEMO',
      platform: 'Google Pay',
      title: 'Flat 20% off lunch orders',
      description: 'Works on partner restaurants. Great quick demo voucher for browse, favorite, and redeem flows.',
      imageUrl: voucherImages.food,
      expiryDate: addDays(now, 21),
      value: '20% off',
      donatedByKey: 'maya-user',
      category: 'Food',
      isRedeemed: false,
      redeemedByKey: null,
      redeemedAt: null,
      isActive: true,
      viewCount: 0,
    },
    {
      code: 'PAYTM150-DEMO',
      platform: 'PayTM',
      title: 'Rs. 150 cashback on bill pay',
      description: 'Use on electricity or mobile bill payments above Rs. 999.',
      imageUrl: voucherImages.payments,
      expiryDate: addDays(now, 14),
      value: 'Rs. 150 cashback',
      donatedByKey: 'arjun-user',
      category: 'Payments',
      isRedeemed: false,
      redeemedByKey: null,
      redeemedAt: null,
      isActive: true,
      viewCount: 0,
    },
    {
      code: 'STEPUP10-DEMO',
      platform: 'Myntra',
      title: 'Extra 10% off sneakers',
      description: 'Applicable on selected sneaker brands during checkout.',
      imageUrl: voucherImages.shopping,
      expiryDate: addDays(now, 30),
      value: '10% off',
      donatedByKey: 'customer-user',
      category: 'Shopping',
      isRedeemed: false,
      redeemedByKey: null,
      redeemedAt: null,
      isActive: true,
      viewCount: 0,
    },
    {
      code: 'WEEKENDSTAY-DEMO',
      platform: 'MakeMyTrip',
      title: 'Hotel booking weekend deal',
      description: 'Extra savings on domestic hotels for weekend stays.',
      imageUrl: voucherImages.travel,
      expiryDate: addDays(now, 45),
      value: 'Rs. 500 off',
      donatedByKey: 'arjun-user',
      category: 'Travel',
      isRedeemed: true,
      redeemedByKey: 'customer-user',
      redeemedAt: addDays(now, -1),
      isActive: true,
      viewCount: 0,
    },
  ];

  const campaignVoucherCount = (campaignKey) => vouchers.filter((voucher) => voucher.campaignKey === campaignKey).length;
  const invoices = campaigns.map((campaign, index) => {
    const quantity = campaignVoucherCount(campaign.seedKey);
    const issuedAt = addDays(now, -(index + 6));
    const paidAt = addDays(now, -(index + 5));
    return {
      campaignKey: campaign.seedKey,
      priceVersion: 'v1',
      currency: 'INR',
      baseFeePaise: 9900,
      perVoucherFeePaise: 200,
      quantity,
      totalPaise: 9900 + 200 * quantity,
      status: 'paid',
      issuedAt,
      paidAt,
      externalPaymentReference: `DEMO-SETTLEMENT-${index + 1}`,
      externalPaymentDate: paidAt,
    };
  });

  return {
    users,
    businessProfiles: [{
      seedKey: 'business-profile',
      userKey: 'business-user',
      organizationName: 'VouchIt Demo Partners',
      contactName: 'Demo Business Owner',
      website: 'https://vouchit.app',
    }],
    campaigns,
    invoices,
    vouchers,
    requests: [
      {
        title: 'Need a PhonePe grocery voucher',
        userKey: 'customer-user',
        description: 'Looking for grocery cashback or supermarket vouchers expiring this month.',
        category: 'Groceries',
        responses: 2,
        isActive: true,
      },
      {
        title: 'Any flight coupon for June?',
        userKey: 'maya-user',
        description: 'Need domestic flight coupons for a family trip.',
        category: 'Travel',
        responses: 1,
        isActive: true,
      },
    ],
    comments: [{
      voucherCode: 'GPLAY20-DEMO',
      userKey: 'customer-user',
      text: 'Verified during demo setup. This one is safe to redeem live.',
    }],
    notifications: [{
      userKey: 'customer-user',
      type: 'system',
      title: 'Demo data ready',
      message: 'Your recruiter demo account has seeded vouchers, requests, and activity.',
      voucherCode: 'GPLAY20-DEMO',
      isRead: false,
    }],
    favorites: [{ userKey: 'customer-user', voucherCode: 'GPLAY20-DEMO' }],
    activities: [
      ['donation', 'GPLAY20-DEMO', 'maya-user', 'Voucher donated', 'Flat 20% off lunch orders'],
      ['donation', 'PAYTM150-DEMO', 'arjun-user', 'Voucher donated', 'Rs. 150 cashback on bill pay'],
      ['redemption', 'WEEKENDSTAY-DEMO', 'customer-user', 'Voucher redeemed', 'Hotel booking weekend deal'],
    ],
  };
};

export const buildDemoReconciliationPlan = (fixtures) => ({
  seededUserKeys: fixtures.users.map((user) => user.seedKey),
  seededCampaignKeys: fixtures.campaigns.map((campaign) => campaign.seedKey),
  redeemedVoucherCodes: fixtures.vouchers
    .filter((voucher) => voucher.isRedeemed)
    .map((voucher) => voucher.code),
  unredeemedVoucherCodes: fixtures.vouchers
    .filter((voucher) => !voucher.isRedeemed)
    .map((voucher) => voucher.code),
  campaignVoucherKeys: fixtures.vouchers
    .filter((voucher) => voucher.campaignKey !== undefined)
    .map((voucher) => ({ campaignKey: voucher.campaignKey, code: voucher.code })),
});

export const findStaleCampaignVoucherKeys = (existingVouchers, plan) => existingVouchers.filter((voucher) => (
  plan.seededCampaignKeys.includes(voucher.campaignKey)
  && !plan.campaignVoucherKeys.some((key) => (
    key.campaignKey === voucher.campaignKey && key.code === voucher.code
  ))
));

const loadLocalEnv = () => {
  if (!fs.existsSync('.env')) return;

  for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!key || process.env[key]) continue;

    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }
};

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    username: { type: String, required: true, trim: true, minlength: 3, maxlength: 50 },
    role: { type: String, enum: ['customer', 'business'], default: 'customer' },
    bio: { type: String, default: null },
    profileImage: { type: String, default: null },
    notificationPreferences: {
      email: { type: Boolean, default: true },
      newVouchers: { type: Boolean, default: true },
      voucherExpiry: { type: Boolean, default: true },
      systemUpdates: { type: Boolean, default: true },
    },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } },
);

const businessProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  organizationName: { type: String, required: true, trim: true },
  contactName: { type: String, required: true, trim: true },
  website: { type: String, trim: true },
}, { timestamps: true });
businessProfileSchema.index({ userId: 1 }, { unique: true });

const campaignSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  businessProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessProfile', required: true },
  title: { type: String, required: true, trim: true },
  brandName: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  terms: { type: String, required: true, trim: true },
  platform: { type: String, required: true },
  category: { type: String, required: true },
  imageUrl: { type: String, required: true },
  expiryDate: { type: Date, required: true },
  status: { type: String, enum: ['draft', 'awaiting_payment', 'active', 'completed'], required: true },
  lockedAt: { type: Date, default: null },
}, { timestamps: true });
campaignSchema.index({ businessId: 1 });
campaignSchema.index({ status: 1 });

const invoiceSchema = new mongoose.Schema({
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  priceVersion: { type: String, required: true },
  currency: { type: String, required: true },
  baseFeePaise: { type: Number, required: true },
  perVoucherFeePaise: { type: Number, required: true },
  quantity: { type: Number, required: true },
  totalPaise: { type: Number, required: true },
  status: { type: String, enum: ['issued', 'paid'], required: true },
  issuedAt: { type: Date, required: true },
  paidAt: { type: Date, default: null },
  externalPaymentReference: { type: String, default: null },
  externalPaymentDate: { type: Date, default: null },
}, { timestamps: true });
invoiceSchema.index({ campaignId: 1 }, { unique: true });
invoiceSchema.index(
  { businessId: 1, externalPaymentReference: 1 },
  {
    unique: true,
    partialFilterExpression: { externalPaymentReference: { $type: 'string' } },
  },
);

const voucherSchema = new mongoose.Schema(
  {
    sourceType: { type: String, enum: ['community', 'campaign'], default: 'community' },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', default: null },
    platform: { type: String, required: function () { return this.sourceType !== 'campaign'; } },
    title: { type: String, required: function () { return this.sourceType !== 'campaign'; } },
    description: { type: String, required: function () { return this.sourceType !== 'campaign'; } },
    code: { type: String, required: true, trim: true },
    imageUrl: { type: String, required: function () { return this.sourceType !== 'campaign'; } },
    expiryDate: { type: Date, default: null },
    value: { type: String, default: null },
    donatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    donatedAt: { type: Date, required: true },
    isRedeemed: { type: Boolean, default: false },
    redeemedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    redeemedAt: { type: Date, default: null },
    reportCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    category: { type: String, default: null },
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);
voucherSchema.index({ isActive: 1, isRedeemed: 1, donatedAt: -1 });
voucherSchema.index({ donatedBy: 1 });
voucherSchema.index(
  { campaignId: 1, code: 1 },
  { unique: true, partialFilterExpression: { sourceType: 'campaign' } },
);

const voucherRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  category: { type: String, required: true },
  responses: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'createdAt', updatedAt: true } });
voucherRequestSchema.index({ createdAt: -1 });

const activitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  activityType: { type: String, required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  entityType: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });
activitySchema.index({ createdAt: -1 });

const commentSchema = new mongoose.Schema({
  voucherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true, maxlength: 1000 },
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });
commentSchema.index({ voucherId: 1, createdAt: 1 });

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  voucherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher', default: null },
  isRead: { type: Boolean, default: false },
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });
notificationSchema.index({ userId: 1, createdAt: -1 });

const favoriteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  voucherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher', required: true },
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });
favoriteSchema.index({ userId: 1, voucherId: 1 }, { unique: true });

const redeemedVoucherSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  voucherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher', required: true },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', default: null },
  redeemedAt: { type: Date, required: true },
}, { timestamps: false });
redeemedVoucherSchema.index({ userId: 1, voucherId: 1 }, { unique: true });
redeemedVoucherSchema.index(
  { userId: 1, campaignId: 1 },
  {
    unique: true,
    partialFilterExpression: { campaignId: { $type: 'objectId' } },
  },
);

const reportedVoucherSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  voucherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher', required: true },
  reportedAt: { type: Date, default: Date.now },
}, { timestamps: false });
reportedVoucherSchema.index({ userId: 1, voucherId: 1 }, { unique: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);
const BusinessProfile = mongoose.models.BusinessProfile || mongoose.model('BusinessProfile', businessProfileSchema);
const Campaign = mongoose.models.Campaign || mongoose.model('Campaign', campaignSchema);
const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);
const Voucher = mongoose.models.Voucher || mongoose.model('Voucher', voucherSchema);
const VoucherRequest = mongoose.models.VoucherRequest || mongoose.model('VoucherRequest', voucherRequestSchema);
const Activity = mongoose.models.Activity || mongoose.model('Activity', activitySchema);
const Comment = mongoose.models.Comment || mongoose.model('Comment', commentSchema);
const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
const Favorite = mongoose.models.Favorite || mongoose.model('Favorite', favoriteSchema);
const RedeemedVoucher = mongoose.models.RedeemedVoucher || mongoose.model('RedeemedVoucher', redeemedVoucherSchema);
const ReportedVoucher = mongoose.models.ReportedVoucher || mongoose.model('ReportedVoucher', reportedVoucherSchema);

const userUpdate = (user, passwordHash) => ({
  email: user.email,
  username: user.username,
  role: user.role,
  bio: user.bio,
  passwordHash,
  notificationPreferences: {
    email: true,
    newVouchers: true,
    voucherExpiry: true,
    systemUpdates: true,
  },
});

const upsertFixture = (model, filter, data) => model.findOneAndUpdate(
  filter,
  { $set: data },
  { upsert: true, new: true, setDefaultsOnInsert: true },
);

const run = async () => {
  loadLocalEnv();
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required');
  }

  await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });

  const now = new Date();
  const fixtures = buildDemoFixtures(now);
  const password = process.env.DEMO_PASSWORD || 'DemoPass123!';
  const passwordHash = await bcrypt.hash(password, 12);
  const users = {};
  const vouchers = {};
  const campaigns = {};

  for (const fixture of fixtures.users) {
    users[fixture.seedKey] = await upsertFixture(
      User,
      { email: fixture.email },
      userUpdate(fixture, passwordHash),
    );
  }

  for (const fixture of fixtures.businessProfiles) {
    await upsertFixture(
      BusinessProfile,
      { userId: users[fixture.userKey]._id },
      {
        userId: users[fixture.userKey]._id,
        organizationName: fixture.organizationName,
        contactName: fixture.contactName,
        website: fixture.website,
      },
    );
  }

  const profiles = {};
  for (const fixture of fixtures.businessProfiles) {
    profiles[fixture.seedKey] = await BusinessProfile.findOne({ userId: users[fixture.userKey]._id });
  }

  for (const fixture of fixtures.campaigns) {
    campaigns[fixture.seedKey] = await upsertFixture(
      Campaign,
      { businessId: users[fixture.businessUserKey]._id, title: fixture.title },
      {
        businessId: users[fixture.businessUserKey]._id,
        businessProfileId: profiles[fixture.businessProfileKey]._id,
        title: fixture.title,
        brandName: fixture.brandName,
        description: fixture.description,
        terms: fixture.terms,
        platform: fixture.platform,
        category: fixture.category,
        imageUrl: fixture.imageUrl,
        expiryDate: fixture.expiryDate,
        status: fixture.status,
        lockedAt: fixture.lockedAt,
      },
    );
  }

  const reconciliationPlan = buildDemoReconciliationPlan(fixtures);
  const campaignIds = Object.values(campaigns).map((campaign) => campaign._id);
  const campaignKeyById = new Map(
    Object.entries(campaigns).map(([campaignKey, campaign]) => [String(campaign._id), campaignKey]),
  );
  const existingCampaignVouchers = await Voucher.find(
    { sourceType: 'campaign', campaignId: { $in: campaignIds } },
    { _id: 1, campaignId: 1, code: 1 },
  ).lean();
  const staleCampaignVouchers = findStaleCampaignVoucherKeys(
    existingCampaignVouchers
      .map((voucher) => ({
        _id: voucher._id,
        campaignKey: campaignKeyById.get(String(voucher.campaignId)),
        code: voucher.code,
      })),
    reconciliationPlan,
  );
  const staleCampaignVoucherIds = staleCampaignVouchers.map((voucher) => voucher._id);

  if (staleCampaignVoucherIds.length > 0) {
    await Promise.all([
      Voucher.deleteMany({
        _id: { $in: staleCampaignVoucherIds },
        sourceType: 'campaign',
        campaignId: { $in: campaignIds },
      }),
      RedeemedVoucher.deleteMany({ voucherId: { $in: staleCampaignVoucherIds } }),
      Favorite.deleteMany({ voucherId: { $in: staleCampaignVoucherIds } }),
      Comment.deleteMany({ voucherId: { $in: staleCampaignVoucherIds } }),
      Notification.deleteMany({ voucherId: { $in: staleCampaignVoucherIds } }),
      ReportedVoucher.deleteMany({ voucherId: { $in: staleCampaignVoucherIds } }),
      Activity.deleteMany({
        entityId: { $in: staleCampaignVoucherIds },
        entityType: 'voucher',
      }),
    ]);
  }

  for (const fixture of fixtures.vouchers) {
    const isCampaignVoucher = fixture.campaignKey !== undefined;
    const campaignId = isCampaignVoucher ? campaigns[fixture.campaignKey]._id : null;
    const voucherData = {
      sourceType: isCampaignVoucher ? 'campaign' : 'community',
      campaignId,
      ...(isCampaignVoucher ? {} : {
        platform: fixture.platform,
        title: fixture.title,
        description: fixture.description,
        imageUrl: fixture.imageUrl,
        category: fixture.category,
      }),
      code: fixture.code,
      expiryDate: fixture.expiryDate,
      value: fixture.value,
      donatedBy: users[fixture.donatedByKey]._id,
      donatedAt: now,
      isRedeemed: fixture.isRedeemed,
      redeemedBy: fixture.redeemedByKey ? users[fixture.redeemedByKey]._id : null,
      redeemedAt: fixture.redeemedAt,
      reportCount: 0,
      isActive: fixture.isActive,
      viewCount: fixture.viewCount,
    };
    const filter = isCampaignVoucher
      ? { campaignId, code: fixture.code }
      : { code: fixture.code };
    vouchers[fixture.code] = await upsertFixture(Voucher, filter, voucherData);
  }

  const seededUserIds = Object.values(users).map((user) => user._id);
  const unredeemedVoucherIds = fixtures.vouchers
    .filter((fixture) => !fixture.isRedeemed)
    .map((fixture) => vouchers[fixture.code]._id);
  if (unredeemedVoucherIds.length > 0) {
    await RedeemedVoucher.deleteMany({
      voucherId: { $in: unredeemedVoucherIds },
      userId: { $in: seededUserIds },
    });
  }

  for (const fixture of fixtures.invoices) {
    await upsertFixture(
      Invoice,
      { campaignId: campaigns[fixture.campaignKey]._id },
      {
        campaignId: campaigns[fixture.campaignKey]._id,
        businessId: users['business-user']._id,
        priceVersion: fixture.priceVersion,
        currency: fixture.currency,
        baseFeePaise: fixture.baseFeePaise,
        perVoucherFeePaise: fixture.perVoucherFeePaise,
        quantity: fixture.quantity,
        totalPaise: fixture.totalPaise,
        status: fixture.status,
        issuedAt: fixture.issuedAt,
        paidAt: fixture.paidAt,
        externalPaymentReference: fixture.externalPaymentReference,
        externalPaymentDate: fixture.externalPaymentDate,
      },
    );
  }

  for (const fixture of fixtures.vouchers.filter((item) => item.isRedeemed)) {
    const voucher = vouchers[fixture.code];
    const redemptionCampaignId = fixture.campaignKey
      ? campaigns[fixture.campaignKey]._id
      : null;
    await upsertFixture(
      RedeemedVoucher,
      { userId: voucher.redeemedBy, voucherId: voucher._id },
      {
        userId: voucher.redeemedBy,
        voucherId: voucher._id,
        campaignId: redemptionCampaignId,
        redeemedAt: fixture.redeemedAt,
      },
    );
  }

  for (const fixture of fixtures.favorites) {
    await upsertFixture(
      Favorite,
      { userId: users[fixture.userKey]._id, voucherId: vouchers[fixture.voucherCode]._id },
      { userId: users[fixture.userKey]._id, voucherId: vouchers[fixture.voucherCode]._id },
    );
  }

  for (const fixture of fixtures.requests) {
    await upsertFixture(
      VoucherRequest,
      { title: fixture.title },
      {
        userId: users[fixture.userKey]._id,
        title: fixture.title,
        description: fixture.description,
        category: fixture.category,
        responses: fixture.responses,
        isActive: fixture.isActive,
      },
    );
  }

  for (const fixture of fixtures.comments) {
    await upsertFixture(
      Comment,
      { voucherId: vouchers[fixture.voucherCode]._id, userId: users[fixture.userKey]._id },
      { voucherId: vouchers[fixture.voucherCode]._id, userId: users[fixture.userKey]._id, text: fixture.text },
    );
  }

  for (const fixture of fixtures.notifications) {
    await upsertFixture(
      Notification,
      { userId: users[fixture.userKey]._id, title: fixture.title },
      {
        userId: users[fixture.userKey]._id,
        type: fixture.type,
        title: fixture.title,
        message: fixture.message,
        voucherId: vouchers[fixture.voucherCode]._id,
        isRead: fixture.isRead,
      },
    );
  }

  for (const [activityType, voucherCode, userKey, title, description] of fixtures.activities) {
    await upsertFixture(
      Activity,
      { activityType, entityId: vouchers[voucherCode]._id, userId: users[userKey]._id },
      {
        activityType,
        entityId: vouchers[voucherCode]._id,
        userId: users[userKey]._id,
        title,
        description,
        entityType: 'voucher',
      },
    );
  }

  console.log('Demo seed complete');
  console.log('Customer login: demo@vouchit.app');
  console.log('Business login: business@vouchit.app');
};

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  run()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.disconnect();
    });
}

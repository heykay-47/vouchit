import fs from 'node:fs';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

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

loadLocalEnv();

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is required');
  process.exit(1);
}

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    username: { type: String, required: true, trim: true, minlength: 3, maxlength: 50 },
    bio: { type: String, default: null },
    profileImage: { type: String, default: null },
    notificationPreferences: {
      email: { type: Boolean, default: true },
      newVouchers: { type: Boolean, default: true },
      voucherExpiry: { type: Boolean, default: true },
      systemUpdates: { type: Boolean, default: true },
    },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

const voucherSchema = new mongoose.Schema(
  {
    platform: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true },
    imageUrl: { type: String, required: true },
    expiryDate: { type: Date, default: null },
    value: { type: String, default: null },
    donatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    donatedAt: { type: Date, default: Date.now },
    isRedeemed: { type: Boolean, default: false },
    redeemedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    redeemedAt: { type: Date, default: null },
    reportCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    category: { type: String, default: null },
  },
  { timestamps: true }
);

const voucherRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    responses: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: true } }
);

const activitySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    activityType: { type: String, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    entityType: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

const commentSchema = new mongoose.Schema(
  {
    voucherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    voucherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher', default: null },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

const favoriteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  voucherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher', required: true },
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });

favoriteSchema.index({ userId: 1, voucherId: 1 }, { unique: true });

const redeemedVoucherSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  voucherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher', required: true },
  redeemedAt: { type: Date, default: Date.now },
}, { timestamps: false });

redeemedVoucherSchema.index({ userId: 1, voucherId: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);
const Voucher = mongoose.model('Voucher', voucherSchema);
const VoucherRequest = mongoose.model('VoucherRequest', voucherRequestSchema);
const Activity = mongoose.model('Activity', activitySchema);
const Comment = mongoose.model('Comment', commentSchema);
const Notification = mongoose.model('Notification', notificationSchema);
const Favorite = mongoose.model('Favorite', favoriteSchema);
const RedeemedVoucher = mongoose.model('RedeemedVoucher', redeemedVoucherSchema);

const addDays = (days) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date;
};

const demoUsers = [
  {
    email: 'demo@vouchit.app',
    username: 'demo_recruiter',
    bio: 'Recruiter demo account with sample favorites, redemptions, and notifications.',
  },
  {
    email: 'maya@vouchit.app',
    username: 'maya_saves',
    bio: 'Shares grocery and food delivery offers with the community.',
  },
  {
    email: 'arjun@vouchit.app',
    username: 'arjun_deals',
    bio: 'Finds travel, payments, and shopping vouchers before they expire.',
  },
];

const voucherImages = {
  food: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80',
  shopping: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=900&q=80',
  travel: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80',
  payments: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=80',
};

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });

  const password = process.env.DEMO_PASSWORD || 'DemoPass123!';
  const passwordHash = await bcrypt.hash(password, 12);
  const users = {};

  for (const user of demoUsers) {
    users[user.username] = await User.findOneAndUpdate(
      { email: user.email },
      {
        ...user,
        passwordHash,
        notificationPreferences: {
          email: true,
          newVouchers: true,
          voucherExpiry: true,
          systemUpdates: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  const voucherSeeds = [
    {
      platform: 'Google Pay',
      title: 'Flat 20% off lunch orders',
      description: 'Works on partner restaurants. Great quick demo voucher for browse, favorite, and redeem flows.',
      code: 'GPLAY20-DEMO',
      imageUrl: voucherImages.food,
      expiryDate: addDays(21),
      value: '20% off',
      donatedBy: users.maya_saves._id,
      category: 'Food',
    },
    {
      platform: 'PayTM',
      title: 'Rs. 150 cashback on bill pay',
      description: 'Use on electricity or mobile bill payments above Rs. 999.',
      code: 'PAYTM150-DEMO',
      imageUrl: voucherImages.payments,
      expiryDate: addDays(14),
      value: 'Rs. 150 cashback',
      donatedBy: users.arjun_deals._id,
      category: 'Payments',
    },
    {
      platform: 'Myntra',
      title: 'Extra 10% off sneakers',
      description: 'Applicable on selected sneaker brands during checkout.',
      code: 'STEPUP10-DEMO',
      imageUrl: voucherImages.shopping,
      expiryDate: addDays(30),
      value: '10% off',
      donatedBy: users.demo_recruiter._id,
      category: 'Shopping',
    },
    {
      platform: 'MakeMyTrip',
      title: 'Hotel booking weekend deal',
      description: 'Extra savings on domestic hotels for weekend stays.',
      code: 'WEEKENDSTAY-DEMO',
      imageUrl: voucherImages.travel,
      expiryDate: addDays(45),
      value: 'Rs. 500 off',
      donatedBy: users.arjun_deals._id,
      category: 'Travel',
      isRedeemed: true,
      redeemedBy: users.demo_recruiter._id,
      redeemedAt: addDays(-1),
    },
  ];

  const vouchers = {};
  for (const voucher of voucherSeeds) {
    vouchers[voucher.code] = await Voucher.findOneAndUpdate(
      { code: voucher.code },
      voucher,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  await RedeemedVoucher.findOneAndUpdate(
    { userId: users.demo_recruiter._id, voucherId: vouchers['WEEKENDSTAY-DEMO']._id },
    { userId: users.demo_recruiter._id, voucherId: vouchers['WEEKENDSTAY-DEMO']._id, redeemedAt: addDays(-1) },
    { upsert: true, new: true }
  );

  await Favorite.findOneAndUpdate(
    { userId: users.demo_recruiter._id, voucherId: vouchers['GPLAY20-DEMO']._id },
    { userId: users.demo_recruiter._id, voucherId: vouchers['GPLAY20-DEMO']._id },
    { upsert: true, new: true }
  );

  await Promise.all([
    VoucherRequest.findOneAndUpdate(
      { title: 'Need a PhonePe grocery voucher' },
      {
        userId: users.demo_recruiter._id,
        title: 'Need a PhonePe grocery voucher',
        description: 'Looking for grocery cashback or supermarket vouchers expiring this month.',
        category: 'Groceries',
        responses: 2,
        isActive: true,
      },
      { upsert: true, new: true }
    ),
    VoucherRequest.findOneAndUpdate(
      { title: 'Any flight coupon for June?' },
      {
        userId: users.maya_saves._id,
        title: 'Any flight coupon for June?',
        description: 'Need domestic flight coupons for a family trip.',
        category: 'Travel',
        responses: 1,
        isActive: true,
      },
      { upsert: true, new: true }
    ),
  ]);

  await Promise.all([
    Comment.findOneAndUpdate(
      { voucherId: vouchers['GPLAY20-DEMO']._id, userId: users.demo_recruiter._id },
      {
        voucherId: vouchers['GPLAY20-DEMO']._id,
        userId: users.demo_recruiter._id,
        text: 'Verified during demo setup. This one is safe to redeem live.',
      },
      { upsert: true, new: true }
    ),
    Notification.findOneAndUpdate(
      { userId: users.demo_recruiter._id, title: 'Demo data ready' },
      {
        userId: users.demo_recruiter._id,
        type: 'system',
        title: 'Demo data ready',
        message: 'Your recruiter demo account has seeded vouchers, requests, and activity.',
        voucherId: vouchers['GPLAY20-DEMO']._id,
        isRead: false,
      },
      { upsert: true, new: true }
    ),
  ]);

  const activities = [
    ['donation', vouchers['GPLAY20-DEMO']._id, users.maya_saves._id, 'Voucher donated', 'Flat 20% off lunch orders'],
    ['donation', vouchers['PAYTM150-DEMO']._id, users.arjun_deals._id, 'Voucher donated', 'Rs. 150 cashback on bill pay'],
    ['redemption', vouchers['WEEKENDSTAY-DEMO']._id, users.demo_recruiter._id, 'Voucher redeemed', 'Hotel booking weekend deal'],
  ];

  for (const [activityType, entityId, userId, title, description] of activities) {
    await Activity.findOneAndUpdate(
      { activityType, entityId, userId },
      { activityType, entityId, userId, title, description, entityType: 'voucher' },
      { upsert: true, new: true }
    );
  }

  console.log('Demo seed complete');
  console.log('Login: demo@vouchit.app');
  console.log(`Password: ${password}`);
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });

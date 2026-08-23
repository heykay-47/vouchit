import mongoose, { Schema } from 'mongoose';

const redeemedVoucherSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    voucherId: { type: Schema.Types.ObjectId, ref: 'Voucher', required: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', default: null },
    redeemedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

redeemedVoucherSchema.index({ userId: 1, voucherId: 1 }, { unique: true });
redeemedVoucherSchema.index(
  { userId: 1, campaignId: 1 },
  {
    unique: true,
    partialFilterExpression: { campaignId: { $type: 'objectId' } },
  },
);

export const RedeemedVoucher: mongoose.Model<any> =
  (mongoose.models.RedeemedVoucher as mongoose.Model<any>) || mongoose.model('RedeemedVoucher', redeemedVoucherSchema);

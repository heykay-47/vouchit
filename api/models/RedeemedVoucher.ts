import mongoose, { Schema } from 'mongoose';

const redeemedVoucherSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    voucherId: { type: Schema.Types.ObjectId, ref: 'Voucher', required: true },
    redeemedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

redeemedVoucherSchema.index({ userId: 1, voucherId: 1 }, { unique: true });

export const RedeemedVoucher =
  mongoose.models.RedeemedVoucher || mongoose.model('RedeemedVoucher', redeemedVoucherSchema);

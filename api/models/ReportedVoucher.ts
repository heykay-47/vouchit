import mongoose, { Schema } from 'mongoose';

const reportedVoucherSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    voucherId: { type: Schema.Types.ObjectId, ref: 'Voucher', required: true },
    reportedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

reportedVoucherSchema.index({ userId: 1, voucherId: 1 }, { unique: true });

export const ReportedVoucher =
  mongoose.models.ReportedVoucher || mongoose.model('ReportedVoucher', reportedVoucherSchema);

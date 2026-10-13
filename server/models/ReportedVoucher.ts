import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const reportedVoucherSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    voucherId: { type: Schema.Types.ObjectId, ref: 'Voucher', required: true },
    reportedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

reportedVoucherSchema.index({ userId: 1, voucherId: 1 }, { unique: true });

export type ReportedVoucherDocument = InferSchemaType<typeof reportedVoucherSchema> & { _id: mongoose.Types.ObjectId };
export const ReportedVoucher: mongoose.Model<ReportedVoucherDocument> =
  (mongoose.models.ReportedVoucher as mongoose.Model<ReportedVoucherDocument>) ||
  mongoose.model<ReportedVoucherDocument>('ReportedVoucher', reportedVoucherSchema);

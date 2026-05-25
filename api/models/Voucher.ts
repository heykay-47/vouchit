import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const voucherSchema = new Schema(
  {
    platform: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true },
    imageUrl: { type: String, required: true },
    expiryDate: { type: Date, default: null },
    value: { type: String, default: null },
    donatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    donatedAt: { type: Date, default: Date.now },
    isRedeemed: { type: Boolean, default: false },
    redeemedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    redeemedAt: { type: Date, default: null },
    reportCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    category: { type: String, default: null },
  },
  { timestamps: true }
);

export type VoucherDocument = InferSchemaType<typeof voucherSchema> & { _id: mongoose.Types.ObjectId };
export const Voucher: mongoose.Model<any> =
  (mongoose.models.Voucher as mongoose.Model<any>) || mongoose.model('Voucher', voucherSchema);

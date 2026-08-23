import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const voucherSchema = new Schema(
  {
    sourceType: { type: String, enum: ['community', 'campaign'], default: 'community' },
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      required: function (this: { sourceType?: string }) {
        return this.sourceType === 'campaign';
      },
      default: null,
    },
    platform: {
      type: String,
      required: function (this: { sourceType?: string }) {
        return this.sourceType !== 'campaign';
      },
    },
    title: {
      type: String,
      trim: true,
      required: function (this: { sourceType?: string }) {
        return this.sourceType !== 'campaign';
      },
    },
    description: {
      type: String,
      trim: true,
      required: function (this: { sourceType?: string }) {
        return this.sourceType !== 'campaign';
      },
    },
    code: { type: String, required: true, trim: true },
    imageUrl: {
      type: String,
      required: function (this: { sourceType?: string }) {
        return this.sourceType !== 'campaign';
      },
    },
    expiryDate: { type: Date, default: null },
    value: { type: String, default: null },
    donatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    donatedAt: { type: Date, default: Date.now },
    isRedeemed: { type: Boolean, default: false },
    redeemedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    redeemedAt: { type: Date, default: null },
    reportCount: { type: Number, default: 0 },
    isActive: {
      type: Boolean,
      default: function (this: { sourceType?: string }) {
        return this.sourceType === 'campaign' ? false : true;
      },
    },
    category: { type: String, default: null },
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'viewCount must be a non-negative integer',
      },
    },
  },
  { timestamps: true }
);

voucherSchema.index({ isActive: 1, isRedeemed: 1, donatedAt: -1 });
voucherSchema.index({ donatedBy: 1 });
voucherSchema.index(
  { campaignId: 1, code: 1 },
  { unique: true, partialFilterExpression: { sourceType: 'campaign' } },
);
voucherSchema.index({ sourceType: 1, isActive: 1, isRedeemed: 1, expiryDate: 1, _id: 1 });
voucherSchema.index({ campaignId: 1, sourceType: 1, isActive: 1, isRedeemed: 1, expiryDate: 1, _id: 1 });
voucherSchema.index({ campaignId: 1, redeemedBy: 1 });

export type VoucherDocument = InferSchemaType<typeof voucherSchema> & { _id: mongoose.Types.ObjectId };
export const Voucher: mongoose.Model<any> =
  (mongoose.models.Voucher as mongoose.Model<any>) || mongoose.model('Voucher', voucherSchema);

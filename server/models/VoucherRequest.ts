import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const voucherRequestSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    responses: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: true } }
);

voucherRequestSchema.index({ createdAt: -1 });

export type VoucherRequestDocument = InferSchemaType<typeof voucherRequestSchema> & { _id: mongoose.Types.ObjectId };
export const VoucherRequest: mongoose.Model<VoucherRequestDocument> =
  (mongoose.models.VoucherRequest as mongoose.Model<VoucherRequestDocument>) ||
  mongoose.model<VoucherRequestDocument>('VoucherRequest', voucherRequestSchema);

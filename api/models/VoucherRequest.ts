import mongoose, { Schema } from 'mongoose';

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

export const VoucherRequest: mongoose.Model<any> =
  (mongoose.models.VoucherRequest as mongoose.Model<any>) || mongoose.model('VoucherRequest', voucherRequestSchema);

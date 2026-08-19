import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const campaignSchema = new Schema(
  {
    businessId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    businessProfileId: { type: Schema.Types.ObjectId, ref: 'BusinessProfile', required: true },
    title: { type: String, required: true, trim: true },
    brandName: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    terms: { type: String, required: true, trim: true },
    platform: {
      type: String,
      required: true,
      enum: ['Google Pay', 'Paytm', 'PhonePe', 'Other'],
    },
    category: {
      type: String,
      required: true,
      enum: ['Food', 'Shopping', 'Travel', 'Entertainment', 'Electronics', 'Health', 'Other'],
    },
    imageUrl: { type: String, required: true },
    expiryDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['draft', 'awaiting_payment', 'active', 'completed'],
      default: 'draft',
    },
    lockedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

campaignSchema.index({ businessId: 1 });
campaignSchema.index({ status: 1 });

export type CampaignDocument = InferSchemaType<typeof campaignSchema> & { _id: mongoose.Types.ObjectId };
export const Campaign: mongoose.Model<CampaignDocument> =
  (mongoose.models.Campaign as mongoose.Model<CampaignDocument>) ||
  mongoose.model<CampaignDocument>('Campaign', campaignSchema);

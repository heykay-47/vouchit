import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const businessProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    organizationName: { type: String, required: true, trim: true },
    contactName: { type: String, required: true, trim: true },
    website: { type: String, trim: true, match: /^https:\/\/.+/ },
  },
  { timestamps: true }
);

businessProfileSchema.index({ userId: 1 }, { unique: true });

export type BusinessProfileDocument = InferSchemaType<typeof businessProfileSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const BusinessProfile: mongoose.Model<BusinessProfileDocument> =
  (mongoose.models.BusinessProfile as mongoose.Model<BusinessProfileDocument>) ||
  mongoose.model<BusinessProfileDocument>('BusinessProfile', businessProfileSchema);

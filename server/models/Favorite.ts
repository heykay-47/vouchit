import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const favoriteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    voucherId: { type: Schema.Types.ObjectId, ref: 'Voucher', required: true },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

favoriteSchema.index({ userId: 1, voucherId: 1 }, { unique: true });

export type FavoriteDocument = InferSchemaType<typeof favoriteSchema> & { _id: mongoose.Types.ObjectId };
export const Favorite: mongoose.Model<FavoriteDocument> =
  (mongoose.models.Favorite as mongoose.Model<FavoriteDocument>) ||
  mongoose.model<FavoriteDocument>('Favorite', favoriteSchema);

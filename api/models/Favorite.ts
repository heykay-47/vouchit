import mongoose, { Schema } from 'mongoose';

const favoriteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    voucherId: { type: Schema.Types.ObjectId, ref: 'Voucher', required: true },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

favoriteSchema.index({ userId: 1, voucherId: 1 }, { unique: true });

export const Favorite = mongoose.models.Favorite || mongoose.model('Favorite', favoriteSchema);

import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const notificationPreferencesSchema = new Schema(
  {
    email: { type: Boolean, default: true },
    newVouchers: { type: Boolean, default: true },
    voucherExpiry: { type: Boolean, default: true },
    systemUpdates: { type: Boolean, default: true },
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    username: { type: String, required: true, trim: true, minlength: 3, maxlength: 50 },
    bio: { type: String, default: null },
    profileImage: { type: String, default: null },
    notificationPreferences: { type: notificationPreferencesSchema, default: () => ({}) },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

export type UserDocument = InferSchemaType<typeof userSchema> & { _id: mongoose.Types.ObjectId };
export const User = mongoose.models.User || mongoose.model('User', userSchema);

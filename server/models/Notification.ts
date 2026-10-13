import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, required: true },
    voucherId: { type: Schema.Types.ObjectId, ref: 'Voucher', default: null },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

notificationSchema.index({ userId: 1, createdAt: -1 });

export type NotificationDocument = InferSchemaType<typeof notificationSchema> & { _id: mongoose.Types.ObjectId };
export const Notification: mongoose.Model<NotificationDocument> =
  (mongoose.models.Notification as mongoose.Model<NotificationDocument>) ||
  mongoose.model<NotificationDocument>('Notification', notificationSchema);

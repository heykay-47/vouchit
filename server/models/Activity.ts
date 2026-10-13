import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const activitySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    activityType: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    entityType: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

activitySchema.index({ createdAt: -1 });

export type ActivityDocument = InferSchemaType<typeof activitySchema> & { _id: mongoose.Types.ObjectId };
export const Activity: mongoose.Model<ActivityDocument> =
  (mongoose.models.Activity as mongoose.Model<ActivityDocument>) ||
  mongoose.model<ActivityDocument>('Activity', activitySchema);

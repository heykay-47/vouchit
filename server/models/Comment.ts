import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const commentSchema = new Schema(
  {
    voucherId: { type: Schema.Types.ObjectId, ref: 'Voucher', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

commentSchema.index({ voucherId: 1, createdAt: 1 });

export type CommentDocument = InferSchemaType<typeof commentSchema> & { _id: mongoose.Types.ObjectId };
export const Comment: mongoose.Model<CommentDocument> =
  (mongoose.models.Comment as mongoose.Model<CommentDocument>) ||
  mongoose.model<CommentDocument>('Comment', commentSchema);

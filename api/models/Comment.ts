import mongoose, { Schema } from 'mongoose';

const commentSchema = new Schema(
  {
    voucherId: { type: Schema.Types.ObjectId, ref: 'Voucher', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

export const Comment: mongoose.Model<any> =
  (mongoose.models.Comment as mongoose.Model<any>) || mongoose.model('Comment', commentSchema);

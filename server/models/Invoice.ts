import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const integerPaise = {
  type: Number,
  required: true,
  min: 0,
  validate: {
    validator: Number.isInteger,
    message: 'Amount must be an integer number of paise',
  },
};

const invoiceSchema = new Schema(
  {
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true, immutable: true },
    businessId: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    priceVersion: { type: String, enum: ['v1'], required: true, immutable: true },
    currency: { type: String, enum: ['INR'], required: true, immutable: true },
    baseFeePaise: { ...integerPaise, immutable: true },
    perVoucherFeePaise: { ...integerPaise, immutable: true },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 500,
      immutable: true,
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be an integer from 1 to 500',
      },
    },
    totalPaise: { ...integerPaise, immutable: true },
    status: { type: String, enum: ['issued', 'paid'], default: 'issued' },
    issuedAt: { type: Date, default: Date.now, immutable: true },
    paidAt: { type: Date, default: null },
    externalPaymentReference: { type: String, default: null, trim: true },
    externalPaymentDate: { type: Date, default: null },
  },
  { timestamps: true },
);

invoiceSchema.index({ campaignId: 1 }, { unique: true });
invoiceSchema.index(
  { businessId: 1, externalPaymentReference: 1 },
  {
    unique: true,
    partialFilterExpression: { externalPaymentReference: { $type: 'string' } },
  },
);

export type InvoiceDocument = InferSchemaType<typeof invoiceSchema> & { _id: mongoose.Types.ObjectId };
export const Invoice: mongoose.Model<InvoiceDocument> =
  (mongoose.models.Invoice as mongoose.Model<InvoiceDocument>) ||
  mongoose.model<InvoiceDocument>('Invoice', invoiceSchema);

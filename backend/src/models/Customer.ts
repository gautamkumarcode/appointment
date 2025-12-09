import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomer extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  timezone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    timezone: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index for tenant + email
CustomerSchema.index({ tenantId: 1, email: 1 }, { unique: true });

export const Customer = mongoose.model<ICustomer>('Customer', CustomerSchema);

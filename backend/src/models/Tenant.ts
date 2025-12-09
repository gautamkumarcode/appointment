import mongoose, { Document, Schema } from 'mongoose';

export interface ITenant extends Document {
  slug: string;
  businessName: string;
  email: string;
  phone?: string;
  timezone: string;
  currency: string;
  logo?: string;
  primaryColor?: string;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema = new Schema<ITenant>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    businessName: {
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
      default: 'UTC',
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
    },
    logo: {
      type: String,
    },
    primaryColor: {
      type: String,
    },
    settings: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

export const Tenant = mongoose.model<ITenant>('Tenant', TenantSchema);

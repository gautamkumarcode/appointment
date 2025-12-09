import mongoose, { Document, Schema } from 'mongoose';

export interface IService extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  currency: string;
  bufferMinutes: number;
  requireStaff: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const ServiceSchema = new Schema<IService>(
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
    description: {
      type: String,
      trim: true,
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
    },
    bufferMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    requireStaff: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const Service = mongoose.model<IService>('Service', ServiceSchema);

import mongoose, { Document, Schema } from 'mongoose';

export interface IStaff extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  weeklySchedule: Record<string, { start: string; end: string }[]>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const StaffSchema = new Schema<IStaff>(
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
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    weeklySchedule: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const Staff = mongoose.model<IStaff>('Staff', StaffSchema);

import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  tenantId: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  role: 'owner' | 'admin' | 'staff';
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'staff'],
      default: 'owner',
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index for tenant + email
UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });

export const User = mongoose.model<IUser>('User', UserSchema);

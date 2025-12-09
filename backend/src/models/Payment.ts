import mongoose, { Document, Schema } from 'mongoose';

export interface IPayment extends Document {
  tenantId: mongoose.Types.ObjectId;
  appointmentId?: mongoose.Types.ObjectId;
  provider: 'stripe' | 'razorpay';
  providerPaymentId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Appointment',
    },
    provider: {
      type: String,
      enum: ['stripe', 'razorpay'],
      required: true,
    },
    providerPaymentId: {
      type: String,
      required: true,
      unique: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);

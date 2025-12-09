import mongoose, { Document, Schema } from 'mongoose';

export interface IAppointment extends Document {
  tenantId: mongoose.Types.ObjectId;
  serviceId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  staffId?: mongoose.Types.ObjectId;
  startTime: Date;
  endTime: Date;
  customerTimezone: string;
  status: 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  paymentOption: 'prepaid' | 'pay_at_venue';
  paymentStatus: 'unpaid' | 'paid' | 'refunded';
  paymentId?: string;
  amount?: number;
  rescheduleToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema = new Schema<IAppointment>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    staffId: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    customerTimezone: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['confirmed', 'completed', 'cancelled', 'no-show'],
      default: 'confirmed',
    },
    notes: {
      type: String,
      trim: true,
    },
    paymentOption: {
      type: String,
      enum: ['prepaid', 'pay_at_venue'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded'],
      default: 'unpaid',
    },
    paymentId: {
      type: String,
    },
    amount: {
      type: Number,
      min: 0,
    },
    rescheduleToken: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
AppointmentSchema.index({ tenantId: 1, startTime: 1 });
AppointmentSchema.index({ staffId: 1, startTime: 1 });

export const Appointment = mongoose.model<IAppointment>('Appointment', AppointmentSchema);

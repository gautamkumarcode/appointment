import mongoose, { Document, Schema } from 'mongoose';

export interface IStaffHoliday extends Document {
  staffId: mongoose.Types.ObjectId;
  date: Date;
  reason?: string;
  createdAt: Date;
}

const StaffHolidaySchema = new Schema<IStaffHoliday>(
  {
    staffId: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound index for efficient queries
StaffHolidaySchema.index({ staffId: 1, date: 1 });

export const StaffHoliday = mongoose.model<IStaffHoliday>('StaffHoliday', StaffHolidaySchema);

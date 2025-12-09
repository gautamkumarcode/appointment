import mongoose, { Document, Schema } from 'mongoose';

export interface IAIConversation extends Document {
  tenantId: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  channel: 'web' | 'whatsapp' | 'messenger' | 'instagram';
  externalId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AIConversationSchema = new Schema<IAIConversation>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
    },
    channel: {
      type: String,
      enum: ['web', 'whatsapp', 'messenger', 'instagram'],
      required: true,
    },
    externalId: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index for channel + externalId
AIConversationSchema.index({ channel: 1, externalId: 1 }, { unique: true, sparse: true });

export const AIConversation = mongoose.model<IAIConversation>(
  'AIConversation',
  AIConversationSchema
);

import mongoose, { Document, Schema } from 'mongoose';

export interface IAIMessage extends Document {
  conversationId: mongoose.Types.ObjectId;
  role: 'user' | 'assistant';
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const AIMessageSchema = new Schema<IAIMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'AIConversation',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const AIMessage = mongoose.model<IAIMessage>('AIMessage', AIMessageSchema);

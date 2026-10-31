import { Schema, model, Document, Types } from 'mongoose';

export interface IMessage {
  _id?: Types.ObjectId;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

export interface IConversation extends Document {
  title: string;
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const ConversationSchema = new Schema<IConversation>(
  {
    title: {
      type: String,
      default: 'New Conversation',
      trim: true,
    },
    messages: [MessageSchema],
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

// Index to quickly fetch recent conversations for the sidebar
ConversationSchema.index({ updatedAt: -1 });

export const Conversation = model<IConversation>('Conversation', ConversationSchema);
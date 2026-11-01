export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt?: string | Date;
}

export interface ConversationSummary {
  _id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
}
export type MessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
}

// Wire format sent across HTTP to our backend
export interface HistoryMessagePayload {
  role: MessageRole;
  content: string;
}
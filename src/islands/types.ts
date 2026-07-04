export interface Message {
  id: string;
  sessionId: string;
  sender: 'buyer' | 'seller';
  content: string;
  timestamp: string;
}

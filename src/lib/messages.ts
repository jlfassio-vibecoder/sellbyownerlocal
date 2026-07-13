import {
  BuyerConversationSchema,
  ConversationSchema,
  MessageSchema,
  type BuyerConversation,
  type Message,
} from '../schemas';

function toIsoTimestamp(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

export function mapMessageDoc(id: string, data: Record<string, unknown>) {
  return MessageSchema.safeParse({
    id,
    ...data,
    timestamp: toIsoTimestamp(data.timestamp),
  });
}

export function aggregateConversations(
  messages: Message[],
  unreadSender: 'buyer' | 'seller' = 'buyer'
): Array<Message & { unreadCount: number }> {
  const sessionsMap = new Map<string, Message & { unreadCount: number }>();

  for (const msg of messages) {
    const { sessionId } = msg;

    if (!sessionsMap.has(sessionId)) {
      sessionsMap.set(sessionId, { ...msg, unreadCount: 0 });
    }

    if (msg.sender === unreadSender && msg.isRead === 0) {
      const session = sessionsMap.get(sessionId)!;
      session.unreadCount += 1;
    }
  }

  return Array.from(sessionsMap.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function toConversations(messages: Message[]) {
  return aggregateConversations(messages, 'buyer').flatMap((msg) => {
    const parsed = ConversationSchema.safeParse(msg);
    return parsed.success ? [parsed.data] : [];
  });
}

export function toBuyerConversationRows(
  messages: Message[]
): Array<Message & { unreadCount: number }> {
  // Buyer mark-as-read is not implemented yet; do not infer unread from seller isRead
  // (that flag is only cleared for buyer→seller messages today).
  return aggregateConversations(messages, 'buyer').map((row) => ({
    ...row,
    unreadCount: 0,
  }));
}

export function buildBuyerConversation(input: {
  sessionId: string;
  vehicleId: string;
  vehicleTitle: string;
  vehicleImageUrl?: string;
  latestMessage: Message;
  unreadCount: number;
}): BuyerConversation | null {
  const parsed = BuyerConversationSchema.safeParse({
    sessionId: input.sessionId,
    vehicleId: input.vehicleId,
    vehicleTitle: input.vehicleTitle,
    vehicleImageUrl: input.vehicleImageUrl ?? '',
    latestMessage: input.latestMessage,
    unreadCount: input.unreadCount,
  });
  return parsed.success ? parsed.data : null;
}

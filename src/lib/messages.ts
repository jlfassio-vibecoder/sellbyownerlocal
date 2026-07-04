import { ConversationSchema, MessageSchema, type Message } from '../schemas';

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
  messages: Message[]
): Array<Message & { unreadCount: number }> {
  const sessionsMap = new Map<string, Message & { unreadCount: number }>();

  for (const msg of messages) {
    const { sessionId } = msg;

    if (!sessionsMap.has(sessionId)) {
      sessionsMap.set(sessionId, { ...msg, unreadCount: 0 });
    }

    if (msg.sender === 'buyer' && msg.isRead === 0) {
      const session = sessionsMap.get(sessionId)!;
      session.unreadCount += 1;
    }
  }

  return Array.from(sessionsMap.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function toConversations(messages: Message[]) {
  return aggregateConversations(messages).flatMap((msg) => {
    const parsed = ConversationSchema.safeParse(msg);
    return parsed.success ? [parsed.data] : [];
  });
}

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  BuyerConversationsResponseSchema,
  type BuyerConversation,
} from '../../schemas';

function truncateSnippet(text: string, max = 100): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function ConversationSkeleton() {
  return (
    <ul className="space-y-3" aria-hidden="true">
      {[0, 1, 2].map((key) => (
        <li
          key={key}
          className="flex animate-pulse gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"
        >
          <div className="h-14 w-14 shrink-0 rounded-lg bg-slate-200" />
          <div className="min-w-0 flex-1 space-y-2 py-1">
            <div className="h-4 w-3/4 rounded bg-slate-200" />
            <div className="h-3 w-full rounded bg-slate-200" />
            <div className="h-3 w-1/3 rounded bg-slate-200" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function BuyerInbox() {
  const [conversations, setConversations] = useState<BuyerConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch('/api/buyer/conversations', {
          credentials: 'same-origin',
        });
        if (!res.ok) {
          throw new Error('Failed to load messages');
        }
        const data: unknown = await res.json();
        const parsed = BuyerConversationsResponseSchema.safeParse(data);
        if (!parsed.success) {
          throw new Error('Invalid messages response');
        }
        if (!cancelled) {
          setConversations(parsed.data.conversations);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError('Unable to load your messages');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <ConversationSkeleton />;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (conversations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
        <p className="text-sm font-medium text-slate-700">No messages yet</p>
        <p className="mt-1 text-sm text-slate-500">
          Message a seller from a vehicle listing to start a conversation.
        </p>
        <a
          href="/vehicles"
          className="mt-4 inline-flex text-sm font-semibold text-red-600 hover:text-red-700"
        >
          Browse vehicles →
        </a>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
      {conversations.map((conversation) => {
        const hasUnread = conversation.unreadCount > 0;
        const href = `/vehicles/${conversation.vehicleId}`;
        const when = formatDistanceToNow(new Date(conversation.latestMessage.timestamp), {
          addSuffix: true,
        });

        return (
          <li key={`${conversation.sessionId}-${conversation.vehicleId}`}>
            <a
              href={href}
              onClick={() => {
                try {
                  localStorage.setItem(
                    `buyer_session_${conversation.vehicleId}`,
                    conversation.sessionId
                  );
                } catch {
                  // Navigation still proceeds if storage is unavailable.
                }
              }}
              className="flex gap-3 p-3 transition-colors hover:bg-slate-50 sm:p-4"
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                {conversation.vehicleImageUrl ? (
                  <img
                    src={conversation.vehicleImageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] font-medium text-slate-400">
                    No photo
                  </div>
                )}
                {hasUnread ? (
                  <span
                    className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-white"
                    aria-hidden="true"
                  />
                ) : null}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3
                    className={`truncate text-sm text-slate-900 ${
                      hasUnread ? 'font-bold' : 'font-semibold'
                    }`}
                  >
                    {conversation.vehicleTitle}
                  </h3>
                  <time
                    className="shrink-0 text-xs text-slate-400"
                    dateTime={conversation.latestMessage.timestamp}
                  >
                    {when}
                  </time>
                </div>
                <p
                  className={`mt-1 line-clamp-2 text-sm ${
                    hasUnread ? 'font-medium text-slate-800' : 'text-slate-500'
                  }`}
                >
                  {truncateSnippet(conversation.latestMessage.content)}
                </p>
                {hasUnread ? (
                  <p className="mt-1 text-xs font-semibold text-red-600">
                    {conversation.unreadCount} unread
                  </p>
                ) : null}
              </div>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

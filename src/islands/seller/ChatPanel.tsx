import { useEffect, useRef, useState, type FormEvent } from 'react';
import { format } from 'date-fns';
import { Clock, MessageCircle, Send, User } from 'lucide-react';
import { getSessionMessages, sendMessage } from '../../lib/chat-api';
import { getConversations, markMessagesRead } from '../../lib/seller-api';
import type { Conversation, Message } from '../../schemas';

interface ChatPanelProps {
  vehicleId: string;
  vehicleTitle: string;
}

const POLL_INTERVAL_MS = 3000;

export default function ChatPanel({ vehicleId, vehicleTitle }: ChatPanelProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchConversations = async () => {
      try {
        const data = await getConversations(vehicleId);
        if (!cancelled) {
          setConversations(data);
        }
      } catch (err) {
        console.error('Failed to fetch conversations', err);
      }
    };

    fetchConversations();
    const intervalId = window.setInterval(fetchConversations, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [vehicleId]);

  useEffect(() => {
    if (!activeSession) {
      setMessages([]);
      return;
    }

    let cancelled = false;

    const fetchMessages = async () => {
      try {
        const data = await getSessionMessages(activeSession, vehicleId);
        if (!cancelled) {
          setMessages(data);
        }
      } catch (err) {
        console.error('Failed to fetch messages', err);
      }
    };

    const markRead = async () => {
      try {
        await markMessagesRead(activeSession, vehicleId);
        if (!cancelled) {
          setConversations((prev) =>
            prev.map((conv) =>
              conv.sessionId === activeSession ? { ...conv, unreadCount: 0 } : conv
            )
          );
        }
      } catch (err) {
        console.error('Failed to mark messages read', err);
      }
    };

    fetchMessages();
    markRead();
    const intervalId = window.setInterval(fetchMessages, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeSession, vehicleId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectSession = (sessionId: string) => {
    setActiveSession(sessionId);
    setConversations((prev) =>
      prev.map((conv) =>
        conv.sessionId === sessionId ? { ...conv, unreadCount: 0 } : conv
      )
    );
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !activeSession || isSending) return;

    const content = inputValue.trim();
    setInputValue('');
    setIsSending(true);

    try {
      const created = await sendMessage({
        sessionId: activeSession,
        vehicleId,
        sender: 'seller',
        content,
      });

      setMessages((prev) => {
        if (prev.some((msg) => msg.id === created.id)) return prev;
        return [...prev, created];
      });

      setConversations((prev) => {
        const existingIdx = prev.findIndex((c) => c.sessionId === activeSession);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            content: created.content,
            timestamp: created.timestamp,
            sender: created.sender,
            unreadCount: 0,
          };
          const [moved] = updated.splice(existingIdx, 1);
          updated.unshift(moved);
          return updated;
        }
        return prev;
      });
    } catch (err) {
      console.error('Failed to send message', err);
      setInputValue(content);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <aside className="flex w-80 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-100 bg-slate-50 p-4">
          <h2 className="text-sm font-semibold tracking-wider text-slate-500 uppercase">
            Active Conversations
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center p-8 text-center text-slate-400">
              <Clock size={32} className="mb-2 opacity-50" />
              <p className="text-sm">No live chats yet.</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = activeSession === conv.sessionId;
              return (
                <button
                  key={conv.sessionId}
                  type="button"
                  onClick={() => handleSelectSession(conv.sessionId)}
                  className={`flex w-full items-start gap-3 border-b border-slate-100 p-4 text-left transition-colors hover:bg-slate-50 ${isActive ? 'border-l-4 border-l-slate-900 border-b-slate-100 bg-[#f1f3f5] hover:bg-[#f1f3f5]' : 'border-l-4 border-l-transparent'}`}
                >
                  <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <User size={18} />
                  </div>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="truncate text-sm font-medium">
                        Buyer {conv.sessionId.slice(-4)}
                      </span>
                      <span className="ml-2 text-[10px] whitespace-nowrap text-slate-400">
                        {format(new Date(conv.timestamp), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <p
                      className={`truncate text-xs ${conv.unreadCount > 0 ? 'font-semibold text-slate-900' : 'text-slate-500'}`}
                    >
                      {conv.sender === 'seller' ? 'You: ' : ''}
                      {conv.content}
                    </p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <div className="mt-1 shrink-0 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
                      {conv.unreadCount}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </aside>

      <section className="flex flex-1 flex-col bg-slate-50">
        {activeSession ? (
          <>
            <div className="z-10 flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
                <User size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Buyer {activeSession.slice(-4)}</h3>
                <p className="text-xs text-slate-500">Interested in: {vehicleTitle}</p>
              </div>
            </div>

            <div className="flex flex-1 flex-col space-y-6 overflow-y-auto p-6">
              {messages.map((msg, index) => {
                const isSeller = msg.sender === 'seller';
                const showTime =
                  index === 0 ||
                  new Date(msg.timestamp).getTime() -
                    new Date(messages[index - 1].timestamp).getTime() >
                    300000;

                return (
                  <div
                    key={msg.id || index}
                    className={`flex flex-col ${isSeller ? 'items-end' : 'items-start'}`}
                  >
                    {showTime && (
                      <span className="mb-2 px-1 text-xs font-medium text-slate-400">
                        {format(new Date(msg.timestamp), 'MMM d, h:mm a')}
                      </span>
                    )}
                    <div
                      className={`flex max-w-[70%] ${isSeller ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}
                    >
                      <div
                        className={`rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm ${
                          isSeller
                            ? 'rounded-tr-none bg-slate-900 text-white'
                            : 'rounded-tl-none border border-slate-200 bg-white text-slate-900'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="shrink-0 border-t border-slate-200 bg-white p-4">
              <form
                onSubmit={handleSendMessage}
                className="relative mx-auto flex max-w-4xl gap-3"
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Type your reply..."
                  disabled={isSending}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-3 pr-4 pl-4 text-sm shadow-sm transition-all outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isSending}
                  className="flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3 font-medium text-white shadow-sm transition-all hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-slate-900"
                >
                  <Send size={18} className="mr-2" />
                  {isSending ? 'Sending...' : 'Send'}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-slate-400">
            <MessageCircle size={48} className="mb-4 text-slate-600 opacity-20" />
            <p className="text-lg font-medium text-slate-500">Select a conversation</p>
            <p className="text-sm">Choose a buyer from the sidebar to view messages</p>
          </div>
        )}
      </section>
    </>
  );
}

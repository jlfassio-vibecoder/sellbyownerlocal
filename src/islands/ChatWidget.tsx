import { useEffect, useRef, useState, type FormEvent } from 'react';
import { format } from 'date-fns';
import { getSessionMessages, sendMessage } from '../lib/chat-api';
import type { Message } from '../schemas';

interface ChatWidgetProps {
  vehicleId: string;
  sellerName?: string;
}

const POLL_INTERVAL_MS = 3000;

export default function ChatWidget({ vehicleId, sellerName }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storageKey = `buyer_session_${vehicleId}`;
    let currentSessionId = localStorage.getItem(storageKey);
    if (!currentSessionId) {
      currentSessionId = `session_${crypto.randomUUID()}`;
      localStorage.setItem(storageKey, currentSessionId);
    }
    setSessionId(currentSessionId);
  }, [vehicleId]);

  useEffect(() => {
    if (!isOpen || !sessionId) return;

    let cancelled = false;

    const fetchMessages = async () => {
      try {
        const data = await getSessionMessages(sessionId, vehicleId);
        if (!cancelled) {
          setMessages(data);
        }
      } catch (err) {
        console.error('Failed to fetch messages', err);
      }
    };

    fetchMessages();
    const intervalId = window.setInterval(fetchMessages, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [isOpen, sessionId, vehicleId]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !sessionId || isSending) return;

    const content = inputValue.trim();
    setInputValue('');
    setIsSending(true);

    try {
      const created = await sendMessage({
        sessionId,
        vehicleId,
        sender: 'buyer',
        content,
      });
      setMessages((prev) => {
        if (prev.some((msg) => msg.id === created.id)) return prev;
        return [...prev, created];
      });
    } catch (err) {
      console.error('Failed to send message', err);
      setInputValue(content);
    } finally {
      setIsSending(false);
    }
  };

  const ownerLabel = sellerName ?? 'the owner';

  return (
    <div className="fixed right-6 bottom-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="mb-4 flex h-[500px] w-80 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all duration-300 sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <h3 className="text-sm font-bold text-slate-900">Owner Messaging</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden text-[10px] font-semibold text-slate-400 uppercase sm:inline">
                Typically replies in 1hr
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="ml-2 font-bold text-slate-400 transition-colors hover:text-slate-600"
                aria-label="Close chat"
              >
                ×
              </button>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-4 overflow-y-auto bg-[#f1f3f5] p-4">
            {messages.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-4 text-center text-slate-400">
                <span className="mb-2 text-2xl">💬</span>
                <p className="text-xs">
                  Have a question about this vehicle? Send {ownerLabel} a message directly here.
                </p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isBuyer = msg.sender === 'buyer';

                return (
                  <div
                    key={msg.id || index}
                    className={`flex max-w-[85%] flex-col gap-1 ${isBuyer ? 'items-end self-end' : 'items-start self-start'}`}
                  >
                    <div
                      className={`p-3 text-xs leading-relaxed shadow-sm ${
                        isBuyer
                          ? 'rounded-2xl rounded-tr-none bg-slate-900 text-white'
                          : 'rounded-2xl rounded-tl-none bg-white text-slate-900'
                      }`}
                    >
                      {msg.content}
                    </div>
                    <span className={`text-[10px] text-slate-400 ${isBuyer ? 'mr-1' : 'ml-1'}`}>
                      {format(new Date(msg.timestamp), 'h:mm a')}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-slate-200 bg-white p-4">
            <form onSubmit={handleSendMessage} className="relative flex items-center">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your message to the owner..."
                disabled={isSending}
                className="w-full rounded-full border-none bg-slate-100 py-3 pr-12 pl-4 text-xs text-slate-700 transition-all outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isSending}
                className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white transition-colors hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-slate-900"
              >
                <span className="text-sm font-bold">➔</span>
              </button>
            </form>
            <p className="mt-3 text-center text-[10px] tracking-tighter text-slate-400 uppercase">
              Buyers are protected by our secure communication policy.
            </p>
          </div>
        </div>
      )}

      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group flex items-center justify-center rounded-full bg-slate-900 p-4 text-white shadow-xl transition-all hover:-translate-y-1 hover:bg-slate-800"
          aria-label="Open owner messaging"
        >
          <span className="text-xl transition-transform group-hover:scale-110">💬</span>
        </button>
      )}
    </div>
  );
}

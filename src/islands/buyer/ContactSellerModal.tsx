import { useEffect, useRef, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { FavoriteItem, VerificationTier } from '../../schemas';
import {
  buildContactHelperText,
  buildContactMessage,
  buildContactSubheadline,
  buildSellerScopedLeadMessage,
  syncContactMessageName,
} from '../../lib/contact-message';
import { groupFavoritesBySeller } from '../../utils/favorites';

type ToastState = {
  message: string;
  type: 'success' | 'warning' | 'error';
};

interface ContactSellerModalProps {
  isOpen: boolean;
  isLoggedIn: boolean;
  verificationTier?: VerificationTier;
  favoriteItems: FavoriteItem[];
  isLoadingFavorites?: boolean;
  onClearQuotedItems?: (items: FavoriteItem[]) => Promise<void>;
  onClose: () => void;
}

export default function ContactSellerModal({
  isOpen,
  favoriteItems,
  isLoadingFavorites = false,
  onClearQuotedItems,
  onClose,
}: ContactSellerModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const prefilledForOpenRef = useRef(false);
  const closeTimeoutRef = useRef<number | null>(null);

  const availableItems = favoriteItems.filter(
    (item) => item.sellerId && item.sellerId !== 'unknown'
  );
  const unavailableCount = favoriteItems.length - availableItems.length;

  useEffect(() => {
    if (!isOpen) {
      prefilledForOpenRef.current = false;
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      return;
    }

    if (isLoadingFavorites) return;
    if (prefilledForOpenRef.current) return;
    prefilledForOpenRef.current = true;

    setError(null);
    setToast(null);
    setName('');
    setEmail('');
    setPhone('');
    setMessage(buildContactMessage(availableItems, ''));
  }, [isOpen, favoriteItems, availableItems, isLoadingFavorites]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const handleNameChange = (value: string) => {
    setName(value);
    setMessage((current) => syncContactMessageName(current, value));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setToast(null);
    setIsSubmitting(true);

    try {
      const groups = groupFavoritesBySeller(availableItems);
      if (groups.size === 0) {
        throw new Error('Save at least one available item before requesting a quote.');
      }

      const groupEntries = [...groups.entries()];
      const draftMessage = message;

      const settled = await Promise.allSettled(
        groupEntries.map(async ([sellerId, items]) => {
          const res = await fetch('/api/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sellerId,
              name,
              email,
              phone,
              message: buildSellerScopedLeadMessage(draftMessage, items, name),
              items,
            }),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(
              typeof data.error === 'string' ? data.error : 'Failed to submit request'
            );
          }

          return { sellerId, items };
        })
      );

      const succeeded: FavoriteItem[] = [];
      let failedCount = 0;

      settled.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          succeeded.push(...result.value.items);
        } else {
          failedCount += 1;
          console.error(
            `Lead submit failed for seller ${groupEntries[index]?.[0]}`,
            result.reason
          );
        }
      });

      if (succeeded.length > 0 && onClearQuotedItems) {
        await onClearQuotedItems(succeeded);
      }

      const remainingItems = availableItems.filter(
        (item) => !succeeded.some((done) => done.id === item.id)
      );

      if (failedCount === 0) {
        setToast({
          message: 'Quote request sent successfully.',
          type: 'success',
        });
        closeTimeoutRef.current = window.setTimeout(() => {
          closeTimeoutRef.current = null;
          onClose();
        }, 1500);
        return;
      }

      if (succeeded.length === 0) {
        const messageText = 'Failed to send quote request. Please try again.';
        setError(messageText);
        setToast({ message: messageText, type: 'error' });
        return;
      }

      setMessage(buildContactMessage(remainingItems, name));
      setToast({
        message: `Quotes sent to some sellers, but ${failedCount} failed. Please try again.`,
        type: 'warning',
      });
    } catch (err) {
      const messageText = err instanceof Error ? err.message : 'Failed to submit request';
      setError(messageText);
      setToast({ message: messageText, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const helperText = buildContactHelperText(favoriteItems);
  const subheadline = buildContactSubheadline(favoriteItems);

  const toastClass =
    toast?.type === 'success'
      ? 'bg-emerald-600'
      : toast?.type === 'warning'
        ? 'bg-amber-600'
        : 'bg-red-600';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        aria-label="Close contact seller dialog"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-seller-title"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 id="contact-seller-title" className="text-xl font-bold text-slate-900">
              Contact Seller
            </h2>
            <p className="mt-1 text-sm text-slate-500">{subheadline}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {unavailableCount > 0 && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {unavailableCount} saved listing{unavailableCount === 1 ? ' is' : 's are'} no longer
              available and will be skipped.
            </p>
          )}

          <div>
            <label htmlFor="contact-name" className="mb-1 block text-sm font-medium text-slate-700">
              Name
            </label>
            <input
              id="contact-name"
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div>
            <label htmlFor="contact-email" className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="contact-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div>
            <label htmlFor="contact-phone" className="mb-1 block text-sm font-medium text-slate-700">
              Phone
            </label>
            <input
              id="contact-phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div>
            <p className="mb-1 text-sm font-medium text-slate-700">Message</p>
            <p className="mb-2 text-sm text-slate-500">{helperText}</p>
            <textarea
              id="contact-message"
              required
              rows={10}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isLoadingFavorites}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:bg-slate-50"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoadingFavorites || availableItems.length === 0}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
            >
              {isSubmitting ? 'Sending…' : 'Send Request'}
            </button>
          </div>
        </form>
      </div>

      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 left-1/2 z-[60] max-w-md -translate-x-1/2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${toastClass}`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

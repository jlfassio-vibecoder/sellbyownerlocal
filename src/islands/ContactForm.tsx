import { useState, type ChangeEvent, type FormEvent } from 'react';
import type { VerificationTier } from '../schemas';

interface ContactFormProps {
  vehicleId: string;
  sellerId: string;
  isLoggedIn?: boolean;
  verificationTier?: VerificationTier;
  loginHref?: string;
  apiEndpoint?: string;
  listingIdKey?: 'vehicleId' | 'clothingListingId';
}

export default function ContactForm({
  vehicleId,
  sellerId,
  isLoggedIn = false,
  verificationTier = 'anonymous',
  loginHref = '/login',
  apiEndpoint = '/api/inquiries',
  listingIdKey = 'vehicleId',
}: ContactFormProps) {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = isLoggedIn && verificationTier !== 'anonymous';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [listingIdKey]: vehicleId,
          sellerId,
          ...formData,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.code === 'VERIFICATION_REQUIRED') {
          throw new Error('Verify your phone number to send inquiries.');
        }
        throw new Error(data.error || 'Failed to submit inquiry');
      }

      setIsSubmitted(true);
      setFormData({ name: '', email: '', phone: '', message: '' });

      setTimeout(() => {
        setIsSubmitted(false);
      }, 5000);
    } catch (err) {
      console.error('Failed to submit inquiry', err);
      setError(err instanceof Error ? err.message : 'Failed to submit inquiry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (!isLoggedIn) {
    return (
      <section id="contact" className="mb-16 pt-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm md:p-10">
          <h2 className="mb-2 text-center text-2xl font-bold text-slate-900">Contact Seller</h2>
          <p className="mb-8 text-center text-slate-500">
            Express your interest and schedule a viewing.
          </p>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-6 py-10 text-center">
            <p className="mb-4 text-slate-700">
              Create a free account to contact the seller.
            </p>
            <a
              href={loginHref}
              className="inline-block rounded-lg bg-red-600 px-6 py-3 font-bold text-white shadow-sm transition-colors hover:bg-red-700"
            >
              Sign up or sign in
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="contact" className="mb-16 pt-8">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm md:p-10">
        <h2 className="mb-2 text-center text-2xl font-bold text-slate-900">Contact Seller</h2>
        <p className="mb-8 text-center text-slate-500">
          Express your interest and schedule a viewing.
        </p>

        {isSubmitted ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-6 py-8 text-center text-green-700">
            <h3 className="mb-2 text-lg font-bold">Message Sent!</h3>
            <p className="text-sm">
              Thank you for your interest. The seller will get back to you shortly.
            </p>
          </div>
        ) : (
          <div className="relative">
            {!canSubmit && (
              <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-6 py-4 text-center">
                <p className="mb-3 text-sm text-amber-800">
                  Verify your phone number to send inquiries.
                </p>
                <a
                  href="/account#verify-phone"
                  className="inline-block rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                >
                  Verify phone number
                </a>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className={`space-y-6 ${!canSubmit ? 'pointer-events-none opacity-60' : ''}`}
              aria-disabled={!canSubmit}
            >
              {error && (
                <div className="pointer-events-auto rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    disabled={!canSubmit}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none transition-all placeholder:text-slate-400 focus:border-red-600 focus:ring-2 focus:ring-red-600 disabled:bg-slate-50"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="mb-1 block text-sm font-medium text-slate-700">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={!canSubmit}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none transition-all placeholder:text-slate-400 focus:border-red-600 focus:ring-2 focus:ring-red-600 disabled:bg-slate-50"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  disabled={!canSubmit}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none transition-all placeholder:text-slate-400 focus:border-red-600 focus:ring-2 focus:ring-red-600 disabled:bg-slate-50"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label htmlFor="message" className="mb-1 block text-sm font-medium text-slate-700">
                  Message (Optional)
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  value={formData.message}
                  onChange={handleChange}
                  disabled={!canSubmit}
                  className="w-full resize-none rounded-lg border border-slate-300 px-4 py-2 outline-none transition-all placeholder:text-slate-400 focus:border-red-600 focus:ring-2 focus:ring-red-600 disabled:bg-slate-50"
                  placeholder="I'm interested in this vehicle and would like to..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !canSubmit}
                className="w-full rounded-lg bg-red-600 px-6 py-3 font-bold text-white shadow-sm transition-colors outline-none hover:bg-red-700 focus:ring-2 focus:ring-red-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}

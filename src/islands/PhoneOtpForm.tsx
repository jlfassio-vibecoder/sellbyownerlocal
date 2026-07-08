import { useEffect, useState, type FormEvent } from 'react';
import {
  linkWithPhoneNumber,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from 'firebase/auth';
import { auth } from '../lib/firebase-client';

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}

interface PhoneOtpFormProps {
  onSuccess?: () => void | Promise<void>;
}

type Step = 'phone' | 'code' | 'done';

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (phone.startsWith('+')) return phone;
  return `+${digits}`;
}

function mapFirebaseError(code: string | undefined): string {
  switch (code) {
    case 'auth/invalid-phone-number':
      return 'Invalid phone number. Check the number and try again.';
    case 'auth/too-many-requests':
    case 'auth/quota-exceeded':
      return 'Too many attempts. Please wait and try again later.';
    case 'auth/phone-number-already-exists':
      return 'This phone number is already linked to another account.';
    case 'auth/captcha-check-failed':
      return 'reCAPTCHA verification failed. Please try again.';
    case 'auth/argument-error':
      return 'Verification setup failed. Please refresh the page and try again.';
    default:
      return 'Failed to send verification code. Please try again.';
  }
}

function clearRecaptchaVerifier(): void {
  try {
    window.recaptchaVerifier?.clear();
  } catch {
    // ignore cleanup errors
  }
  delete window.recaptchaVerifier;
}

async function ensureRecaptchaVerifier(): Promise<RecaptchaVerifier> {
  if (window.recaptchaVerifier) {
    return window.recaptchaVerifier;
  }

  const container = document.getElementById('recaptcha-container');
  if (!container) {
    throw new Error('reCAPTCHA container not found');
  }

  const verifier = new RecaptchaVerifier(auth, container, {
    size: 'invisible',
  });

  await verifier.render();
  window.recaptchaVerifier = verifier;
  return verifier;
}

export default function PhoneOtpForm({ onSuccess }: PhoneOtpFormProps) {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [hasFirebaseUser, setHasFirebaseUser] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setHasFirebaseUser(!!user);
      setAuthReady(true);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    return () => {
      clearRecaptchaVerifier();
    };
  }, []);

  const handleSendCode = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const e164 = toE164(phone);
    if (e164.length < 12) {
      setError('Enter a valid 10-digit US phone number.');
      return;
    }

    setIsLoading(true);
    try {
      clearRecaptchaVerifier();
      const verifier = await ensureRecaptchaVerifier();

      const confirmation = auth.currentUser
        ? await linkWithPhoneNumber(auth.currentUser, e164, verifier)
        : await signInWithPhoneNumber(auth, e164, verifier);

      setConfirmationResult(confirmation);
      setStep('code');
    } catch (err: unknown) {
      clearRecaptchaVerifier();
      const firebaseCode = (err as { code?: string })?.code;
      setError(mapFirebaseError(firebaseCode));
      if (!firebaseCode) {
        console.error('Phone OTP send failed', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!confirmationResult) {
      setError('Session expired. Please request a new code.');
      setStep('phone');
      return;
    }

    setIsLoading(true);
    try {
      await confirmationResult.confirm(code.trim());

      if (onSuccess) {
        await onSuccess();
      } else {
        setStep('done');
      }
    } catch (err: unknown) {
      const firebaseCode = (err as { code?: string })?.code;
      if (firebaseCode === 'auth/invalid-verification-code') {
        setError('Invalid code. Please check and try again.');
      } else if (firebaseCode === 'auth/code-expired') {
        setError('Code expired. Request a new one.');
        setStep('phone');
        setConfirmationResult(null);
        setCode('');
      } else {
        setError(err instanceof Error ? err.message : 'Verification failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseDifferentNumber = () => {
    setStep('phone');
    setCode('');
    setConfirmationResult(null);
    clearRecaptchaVerifier();
  };

  if (!authReady) {
    return <p className="text-sm text-slate-500">Loading...</p>;
  }

  if (onSuccess && !hasFirebaseUser) {
    return (
      <p className="text-sm text-amber-700">
        Sign in session not found in this browser.{' '}
        <a href="/login" className="font-semibold text-red-600 hover:text-red-700">
          Sign in again
        </a>{' '}
        to verify your phone.
      </p>
    );
  }

  if (step === 'done') {
    return (
      <p className="text-sm font-medium text-green-700">Phone verified successfully.</p>
    );
  }

  return (
    <div>
      <div id="recaptcha-container" />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {step === 'phone' ? (
        <form onSubmit={handleSendCode} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label htmlFor="phone-otp-number" className="mb-1 block text-sm font-medium text-slate-700">
              Mobile number
            </label>
            <input
              type="tel"
              id="phone-otp-number"
              value={phone}
              onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
              placeholder="(555) 123-4567"
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none transition-all focus:border-red-600 focus:ring-2 focus:ring-red-600"
            />
          </div>
          <button
            id="sign-in-button"
            type="submit"
            disabled={isLoading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Sending...' : 'Send code'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyCode} className="space-y-3">
          <p className="text-sm text-slate-600">
            Enter the 6-digit code sent to {phone}.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[140px] flex-1">
              <label htmlFor="phone-otp-code" className="mb-1 block text-sm font-medium text-slate-700">
                Verification code
              </label>
              <input
                type="text"
                id="phone-otp-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-2 tracking-widest outline-none transition-all focus:border-red-600 focus:ring-2 focus:ring-red-600"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || code.length < 6}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
          <button
            type="button"
            onClick={handleUseDifferentNumber}
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            Use a different number
          </button>
        </form>
      )}
    </div>
  );
}

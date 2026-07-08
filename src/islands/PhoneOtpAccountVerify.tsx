import { useState } from 'react';
import { auth } from '../lib/firebase-client';
import PhoneOtpForm from './PhoneOtpForm';

export default function PhoneOtpAccountVerify() {
  const [error, setError] = useState<string | null>(null);

  const handleSuccess = async () => {
    setError(null);

    const idToken = await auth.currentUser?.getIdToken(true);
    if (!idToken) {
      throw new Error('Not signed in. Please sign in again and retry.');
    }

    const res = await fetch('/api/auth/phone/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to complete phone verification');
    }

    window.location.reload();
  };

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <PhoneOtpForm
        onSuccess={async () => {
          try {
            await handleSuccess();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to complete phone verification');
            throw err;
          }
        }}
      />
    </div>
  );
}
